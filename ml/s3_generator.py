import os
import random
import json
from multiprocessing import Process

import boto3
import pandas as pd
import numpy as np
from psycopg2 import connect
from keras_retinanet.preprocessing.csv_generator import Generator
from keras_retinanet.utils.image import read_image_bgr
from six import raise_from
from PIL import Image
from dotenv import load_dotenv

            
config_path = "../config.json"
load_dotenv(dotenv_path="../.env")

with open(config_path) as config_buffer:    
    config = json.loads(config_buffer.read())['ml']
    
# Connect to database
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

def _query(query, params=None):
    """
    Execture a SQL query
    Returns resulting rows
    """
    conn = connect(database=DB_NAME,
                        user=DB_USER,
                        password=DB_PASSWORD,
                        host=DB_HOST)
    result = pd.read_sql_query(query, conn, params=params)
    conn.close()
    return result


def _parse(value, function, fmt):
    """
    Parse a string into a value, and format a nice ValueError if it fails.
    Returns `function(value)`.
    Any `ValueError` raised is catched and a new `ValueError` is raised
    with message `fmt.format(e)`, where `e` is the caught `ValueError`.
    """
    try:
        return function(value)
    except ValueError as e:
        raise_from(ValueError(fmt.format(e)), None)


class CollectionGenerator(object):

    def __init__(self, 
                 collection_ids, 
                 classmap, 
                 min_examples,
                 validation_split=0.8):

        self.classmap = classmap
        selected_frames, concept_counts = self._select_annotations(collection_ids, min_examples, list(classmap))
        self.selected_frames = selected_frames

        # Shuffle selected frames so that training/testing set are different each run
        random.shuffle(self.selected_frames)

        num_frames = len(self.selected_frames)
        split_index = int(num_frames * validation_split)

        # Split our data into training and testing sets, based on validation_split
        self.training_set = self.selected_frames[0:split_index]
        self.testing_set = self.selected_frames[split_index:]


    def flow_from_s3(self, 
                     image_folder,
                     image_extension='.png',
                     subset='training',
                     **kwargs):

        if subset == 'training':
            return S3Generator(
                selected_frames=self.training_set,
                image_folder=image_folder,
                image_extension=image_extension,
                classes=self.classmap,
                **kwargs
            )
        elif subset in ['validation', 'testing']:
            return S3Generator(
                selected_frames=self.testing_set,
                image_folder=image_folder,
                image_extension=image_extension,
                classes=self.classmap,
                **kwargs
            )
        else:
            raise ValueError('Subset parameter must be either "training" or "validation"/"testing".')


    @staticmethod
    def _select_annotations(collection_ids, min_examples, concepts):
        selected = []
        concept_count = {}

        annotations = CollectionGenerator._get_annotations(collection_ids)

        for concept in concepts:
            concept_count[concept] = 0

        group_frame = annotations.groupby(['videoid', 'frame_num'], sort=False)
        group_frame = [df for _, df in group_frame]

        ai_id = _query("SELECT id FROM users WHERE username='tracking'").id[0]
        
        # Give priority to frames with least amount of tracking annotations
        # And lower speed
        sort_lambda = lambda df : (list(df['userid']).count(ai_id), df.speed.mean())
        group_frame.sort(key=sort_lambda)

        # Selects images that we'll use (each group has annotations for an image)
        for frame in group_frame:
            # Check if we have min number of images already
            if not any(v < min_examples for v in concept_count.values()):
                break
            
            in_annot = []
            for index, row in frame.iterrows():
                concept_count[row['conceptid']] += 1
                in_annot.append(row['conceptid'])

            # Checks if frame has only concept we have too many of
            if any(v > min_examples for v in concept_count.values()):
                # Gets all concepts that we have too many of
                excess = list({key:value for (key,value) in concept_count.items() if value > min_examples})
                # Don't save the annotation if it doens't include concept that we need more of
                if set(excess) >= set(in_annot):
                    for a in in_annot:
                        concept_count[a] -= 1
                    continue
            selected.append(frame)

        return selected, concept_count


    @staticmethod
    def _get_annotations(collection_ids):
        # Query that gets all annotations for given concepts (and child concepts) 
        # making sure that any tracking annotations originated from good users
        annotations_query = r'''
            SELECT
                  A.id,
                  image,
                  userid,
                  videoid,
                  videowidth,
                  videoheight,
                  conceptid,
                  x1, x2, y1, y2,
                  speed,
                  ROUND(fps * timeinvideo) as frame_num
            FROM annotation_intermediate inter
            LEFT JOIN annotations a ON a.id=inter.annotationid
            LEFT JOIN videos ON videos.id=videoid
            WHERE inter.id IN (%s)
        '''

        return _query(annotations_query, [','.join((str(id_) for id_ in collection_ids))] )


class S3Generator(Generator):

    def __init__(self, classes, selected_frames, image_folder, image_extension='.png', **kwargs):

        self.image_folder = image_folder

        # We initalize selected_frames to hold all possible annotation iamges.
        # Then, downloaded_images will hold those that have already been downloaded
        self.selected_frames = selected_frames
        self.downloaded_images =  set(os.listdir(image_folder))

        self.image_extension = image_extension
        self.classes = classes

        self.labels = {}
        for key, value in self.classes.items():
            self.labels[value] = key

        self._connect_s3()

        self.image_data = _read_annotations()

        # Download images in the background while training is happening.
        download_process = Process(target=self._download_images)
        download_process.start()

        super(S3Generator, self).__init__(**kwargs)


    def size(self):
        """ Size of the dataset.
        """
        return len(self.selected)


    def num_classes(self):
        """ Number of classes in the dataset.
        """
        return len(self.classes)


    def has_label(self, label):
        """ Return True if label is a known label.
        """
        return label in self.labels


    def has_name(self, name):
        """ Returns True if name is a known class.
        """
        return name in self.classes


    def name_to_label(self, name):
        """ Map name to label.
        """
        return self.classes[name]


    def label_to_name(self, label):
        """ Map label to name.
        """
        return self.labels[label]


    def image_aspect_ratio(self, image_index):
        """ Compute the aspect ratio for an image with image_index.
        """
        image = self.selected[image_index].iloc[0]
        image_width = image['videowidth']
        image_height = image['videoheight']

        return float(image_width) / float(image_height)


    def load_image(self, image_index):
        """ Load an image at the image_index.
        """
        image = self.selected_frames[image_index].iloc[0]

        if image not in self.downloaded_images:
            self._download_image(image)

        return read_image_bgr(self.image_path(image))


    def image_path(self):
        """ Returns the image path for image_index.
        """
        return os.path.join(self.image_folder, self.image_names[image_index])


    def load_annotations(self, image_index):
        """ Load annotations for an image_index.
        """
        image = self.selected_frames[image_index].iloc[0]
        annotations = {'labels': np.empty((0,)), 'bboxes': np.empty((0, 4))}
        image_name = f'{image["videoid"]}_{image["frame_num"]}'

        for idx, annot in enumerate(self.image_data[image_name]):
            annotations['labels'] = np.concatenate((annotations['labels'], [annot['class']]))
            annotations['bboxes'] = np.concatenate((annotations['bboxes'], [[
                float(annot['x1']),
                float(annot['y1']),
                float(annot['x2']),
                float(annot['y2']),
            ]]))

        return annotations


    def _connect_s3():
        load_dotenv(dotenv_path="../.env")
        S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
        SRC_IMG_FOLDER = os.getenv('AWS_S3_BUCKET_ANNOTATIONS_FOLDER')
        DB_NAME = os.getenv("DB_NAME")
        DB_HOST = os.getenv("DB_HOST")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")

        self.client = boto3.client('s3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'))


    def _download_images():
        for frame in self.selected_frames:
            frame_group = self.selected_frames[frame_index]
            num_annotations = len(frame_group.index)

            for i in range(num_annotations):
                image = frame_group.iloc[i]
                saved_image_name = self._download_image(image)

                if saved_image_name:
                    break
            # Else clause means we successfully downloaded an image for this frame.
            else:
                self.downloaded_images.add(saved_image_name)


    def _download_image(image):
        image_name = str(image['image'])
        try:
            # try to download image. 
            obj = self.client.get_object(Bucket=S3_BUCKET, Key=SRC_IMG_FOLDER + image_name)
            obj_image = Image.open(obj['Body'])

            new_image_name = f'{image["videoid"]}_{image["frame_num"]}'
            return new_image_name
        except:
            print(f'Failed to download {image_name}.')
            self.failed_download_images.append(image['id'])
        
            return None


    def _read_annotations(self):
        """ Read annotations from our selected frames.
            Selected frames are DataFrames.
        """
        result = OrderedDict()
        for frame in self.selected_frames:
            for i in range(num_annotations):
                image = frame_group.iloc[i]
                image_file = f'{image["videoid"]}_{image["frame_num"]}'
                class_id = image['conceptid']

                x1 = image['x1']
                x2 = image['x2']
                y1 = image['y1'] 
                y2 = image['y2']

                if image_file not in result:
                    result[img_file] = []

                # If a row contains only an image path, it's an image without annotations.
                if (x1, y1, x2, y2, class_name) == ('', '', '', '', ''):
                    continue

                x1 = _parse(x1, int, 'line {}: malformed x1: {{}}'.format(line))
                y1 = _parse(y1, int, 'line {}: malformed y1: {{}}'.format(line))
                x2 = _parse(x2, int, 'line {}: malformed x2: {{}}'.format(line))
                y2 = _parse(y2, int, 'line {}: malformed y2: {{}}'.format(line))

                # Check that the bounding box is valid.
                if x2 <= x1:
                    raise ValueError('line {}: x2 ({}) must be higher than x1 ({})'.format(line, x2, x1))
                if y2 <= y1:
                    raise ValueError('line {}: y2 ({}) must be higher than y1 ({})'.format(line, y2, y1))

                # check if the current class name is correctly present
                if class_id not in set(self.labels):
                    raise ValueError('line {}: unknown class id: \'{}\' (classes: {})'.format(line, class_id, class_ids))

                result[image_file].append({'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2, 'class': class_id})
        return result            





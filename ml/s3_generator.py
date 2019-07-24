import os
import random
import json
from collections import OrderedDict

import boto3
import pandas as pd
import numpy as np
from botocore.exceptions import ClientError
from psycopg2 import connect
from keras_retinanet.preprocessing.csv_generator import Generator
from keras_retinanet.utils.image import read_image_bgr
from six import raise_from
from PIL import Image, ImageFile
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
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
SRC_IMG_FOLDER = os.getenv('AWS_S3_BUCKET_ANNOTATIONS_FOLDER')

ImageFile.LOAD_TRUNCATED_IMAGES = True

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


def _atomic_file_exists(file_path):
    try:
        # This file open is atomic. This avoids race conditions when multiple processes are running.
        # This happens when workers > 1 and multiprocessing = True in the fit_generator
        fd = os.open(file_path, os.O_CREAT | os.O_EXCL) 
        os.close(fd)
        return False
    except FileExistsError:
        return True


def _get_classmap(classes):
    """
    Initializes the classmap of each class's database IDs to training IDs
    """
    classes = _query(f"select id from concepts where id = ANY(ARRAY{classes})")
    classmap = pd.Series(classes.index, index=classes.id).to_dict()

    return classmap


class CollectionGenerator(object):

    def __init__(self, 
                 collection_ids, 
                 classes, 
                 min_examples,
                 validation_split=0.8):

        # Start with a list of all possible annotations, grouped by frame in video
        selected_frames, concept_counts = self._select_annotations(collection_ids, min_examples, classes)
        self.selected_frames = selected_frames
        self.classmap = _get_classmap(classes)

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

        # Depending on subset, return either a training or testing generator
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

        frame_groups = annotations.groupby(['videoid', 'frame_num'], sort=False)
        frame_groups = [df for _, df in frame_groups]

        ai_id = _query("SELECT id FROM users WHERE username='tracking'").id[0]
        
        # Give priority to frames with least amount of tracking annotations
        # And lower speed
        sort_lambda = lambda df : (list(df['userid']).count(ai_id), df.speed.mean())
        frame_groups.sort(key=sort_lambda)

        # Selects images that we'll use (each group has annotations for an image)
        for frame in frame_groups:
            # Check if we have min number of images already
            if not any(v < min_examples for v in concept_count.values()):
                break

            first = frame.iloc[0]
            
            in_annot = []
            for i, row in frame.iterrows():
                concept_count[row['conceptid']] += 1
                in_annot.append(row['conceptid'])

                if int(row['videowidth']) != int(first['videowidth']):
                   x_ratio = (row['videowidth'] / first['videowidth'])
                   y_ratio = (row['videoheight'] / first['videoheight'])
                   x1 = min(max(int(row['x1'] / x_ratio), 0), int(first['videowidth']))
                   y1 = min(max(int(row['y1'] / y_ratio), 0), int(first['videoheight']))
                   x2 = min(max(int(row['x2'] / x_ratio), 0), int(first['videowidth']))
                   y2 = min(max(int(row['y2'] / y_ratio), 0), int(first['videoheight']))
                else:
                   x1 = min(max(int(row['x1']),0), int(row['videowidth']))
                   y1 = min(max(int(row['y1']),0), int(row['videoheight']))
                   x2 = min(max(int(row['x2']),0), int(row['videowidth']))
                   y2 = min(max(int(row['y2']),0), int(row['videoheight']))
                if (y1 == y2) or (x1==x2):
                    raise ValueError('Invalid bounding box in {first[image]}')

                frame.at[i, 'x1'] = x1
                frame.at[i, 'x2'] = x2
                frame.at[i, 'y1'] = y1
                frame.at[i, 'y2'] = y2
                    
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

        return _query(annotations_query, [','.join((str(id_) for id_ in collection_ids))])


class S3Generator(Generator):

    def __init__(self, classes, selected_frames, image_folder, image_extension='.png', **kwargs):

        self.image_folder = image_folder

        # We initalize selected_frames to hold all possible annotation iamges.
        # Then, downloaded_images will hold those that have already been downloaded
        self.selected_annotations = pd.concat(selected_frames).reset_index()
        self.selected_annotations['save_name'] = self.selected_annotations.apply(
            lambda row: f'{row["videoid"]}_{int(row["frame_num"])}', 
        axis=1)

        self.downloaded_images = set(os.listdir(image_folder))

        self.image_extension = image_extension
        self.classes = classes
        
        # Make a reverse dictionary so that we can lookup the other way
        self.labels = {}
        for key, value in self.classes.items():
            self.labels[value] = key

        self._connect_s3()

        self.image_data = self._read_annotations()
        super(S3Generator, self).__init__(**kwargs)


    def size(self):
        """ Size of the dataset.
        """
        return len(self.selected_annotations.index)


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
        image = self.selected_annotations.iloc[image_index]
        image_width = image['videowidth']
        image_height = image['videoheight']

        return float(image_width) / float(image_height)


    def load_image(self, image_index):
        """ Load an image at the image_index.
        """
        self._download_image(image_index)
        return read_image_bgr(self.image_path(image_index))


    def image_path(self, image_index):
        """ Returns the image path for image_index.
        """
        image_name = self.selected_annotations.iloc[image_index]['save_name']
        return os.path.join(self.image_folder, image_name + self.image_extension)


    def load_annotations(self, image_index):
        """ Load annotations for an image_index.
        """
        image = self.selected_annotations.iloc[image_index]
        annotations = {'labels': np.empty((0,)), 'bboxes': np.empty((0, 4))}
        image_name = image['save_name']

        for idx, annot in enumerate(self.image_data[image_name]):
            annotations['labels'] = np.concatenate((annotations['labels'], [self.name_to_label(annot['class'])]))
            annotations['bboxes'] = np.concatenate((annotations['bboxes'], [[
                float(annot['x1']),
                float(annot['y1']),
                float(annot['x2']),
                float(annot['y2']),
            ]]))

        return annotations


    def _download_image(self, image_index):
        image = self.selected_annotations.iloc[image_index]
        saved_image_name = image['save_name'] + self.image_extension

        if saved_image_name in self.downloaded_images:
            return

        image_name = str(image['image'])
        try:
            obj = self.client.get_object(Bucket=S3_BUCKET, Key=SRC_IMG_FOLDER + image_name)
            obj_image = Image.open(obj['Body'])
        except ClientError:
            raise IOError(f'File {SRC_IMG_FOLDER}{image_name} not found in S3 bucket.')
    
        if self.image_extension not in image_name:
            image_name += self.image_extension

        image_path = self.image_path(image_index)

        if not _atomic_file_exists(image_path):
            obj_image.save(image_path)
        else:
            # THe file exists, lets make sure it's done downloading.
            # Spin while the file exists, but has no content
            while os.path.getsize(image_path) == 0:
                pass



    def _read_annotations(self):
        """ Read annotations from our selected annotations.
        """
        result = OrderedDict()

        for _, image in self.selected_annotations.iterrows():
            image_file = image['save_name']
            class_name = image['conceptid']

            x1 = image['x1']
            x2 = image['x2']
            y1 = image['y1']
            y2 = image['y2']

            if image_file not in result:
                result[image_file] = []

            x1 = _parse(x1, int, 'malformed x1: {{}}')
            y1 = _parse(y1, int, 'malformed y1: {{}}')
            x2 = _parse(x2, int, 'malformed x2: {{}}')
            y2 = _parse(y2, int, 'malformed y2: {{}}')

            # If a row contains only an image path, it's an image without annotations.
            if (x1, y1, x2, y2, class_name) == ('', '', '', '', ''):
                continue

            # Check that the bounding box is valid.
            if x2 <= x1:
                raise ValueError('x2 ({}) must be higher than x1 ({})'.format(x2, x1))
            if y2 <= y1:
                raise ValueError('y2 ({}) must be higher than y1 ({})'.format(y2, y1))

            # check if the current class name is correctly present
            if class_name not in self.classes:
                raise ValueError('unknown class name: \'{}\' (classes: {})'.format(class_name, set(self.classes)))

            result[image_file].append({'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2, 'class': class_name})

        return result            


    def _connect_s3(self):
        aws_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.client = boto3.client('s3',
            aws_access_key_id=aws_key,
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'))














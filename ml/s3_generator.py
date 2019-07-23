import os
import random

import psycopg2
import boto3
import pandas as pd
from keras_retinanet.preprocessing.csv_generator import Generator
from keras_retinanet.utils.image import read_image_bgr
from six import raise_from
from PIL import Image


# Query that gets all annotations for given concepts (and child concepts) 
# making sure that any tracking annotations originated from good users
annotations_query = f'''SELECT 
                      A.id,
                      image,
                      userid,
                      videoid,
                      videowidth,
                      videoheight,
                      conceptid,
                      x1, x2, y1, y2,
                      speed,
                      fps * timeinvideo as frame_num
                    FROM annotations as A
                    LEFT JOIN videos ON videos.id=videoid
                    WHERE conceptid::text = ANY(string_to_array(%s,','))
                    AND videoid::text = ANY(string_to_array(%s,','))
                    AND EXISTS ( 
                        SELECT id, userid 
                        FROM annotations 
                        WHERE id=originalid 
                        AND unsure = False
                        AND userid::text = ANY(string_to_array(%s,','))
                    )'''


# SQL queries to the database
def _query(query, params=None):
    conn = psycopg2.connect(database=DB_NAME,
                        user=DB_USER,
                        password=DB_PASSWORD,
                        host=DB_HOST,
                        port="5432")
    result = pd.read_sql_query(query, conn, params=params)
    conn.close()
    return result


def _select_annotations(annotations, min_examples, selected_concepts):
    selected = []
    concept_count = {}

    # speed.update_annotation_speed()

    for concept in selected_concepts:
        concept_count[concept] = 0

    group_frame = annotations.groupby(['videoid', 'frame_num'], sort=False)
    group_frame = [df for _, df in group_frame]
    random.shuffle(group_frame) # Shuffle BEFORE the sort

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



class S3Generator(Generator):

    def __init__(self, classes, users, videos, concepts, image_extension='.png', **kwargs):
        users = "\'" +  ','.join(str(e) for e in users) + "\'"
        videos = "\'" + ','.join(str(e) for e in videos) + "\'"
        str_concepts = "\'" + ','.join(str(e) for e in selected_concepts) + "\'"

        annotations = _query(annotations_query, (str_concepts, videos, users))

        selected, concept_counts = select_annotations(annotations, min_examples, selected_concepts)
        print(f'Training {len(concept_counts)} concepts on {len(selected)} images.')

        self.selected = selected
        self.concept_counts = concept_counts
        self.image_extension = image_extension

        # Set that represents all images already downloaded
        self.existing_images = set(os.listdir(img_folder))
        self.failed_download_images = set()

        self.labels = {}
        for key, value in self.classes.items():
            self.labels[value] = key

        self._connect_s3()

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
        image = self.selected[image_index].iloc[0]
        self._download_image(image)

        return read_image_bgr(path)

    def load_annotations(self, image_index):
        """ Load annotations for an image_index.
        """
        filename = self.image_names[image_index] + '.xml'
        try:
            tree = ET.parse(os.path.join(self.data_dir, 'Annotations', filename))
            return self.__parse_annotations(tree.getroot())
        except ET.ParseError as e:
            raise_from(ValueError('invalid annotations file: {}: {}'.format(filename, e)), None)
        except ValueError as e:
            raise_from(ValueError('invalid annotations file: {}: {}'.format(filename, e)), None)


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
        for frame in self.selected:
            frame_group = self.selected[frame_index]
            num_annotations = len(frame_group.index)

            for i in range(num_annotations):
                image = frame_group.iloc[i]

                if self._download_image(image):
                    break
            # else = no break
            else:
                #TODO: Do something
                pass 





    def _download_image(image):
        image_name = str(image['image'])

        # Check if image already exists in image folder
        if image_name in self.existing_images:
            return

        try:
            # try to download image. 
            obj = self.client.get_object(Bucket=S3_BUCKET, Key=SRC_IMG_FOLDER + image_name)
            obj_image = Image.open(obj['Body'])

            new_image_name = f'{image['videoid']}_{image['frame_num']}'
            return True

        # TODO: throw exception
        except:
            print(f'Failed to download {image_name}.'
            self.failed_download_images.append(image['id'])
            return False






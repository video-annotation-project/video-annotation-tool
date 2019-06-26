import json
import math
import pandas as pd
import psycopg2
from PIL import Image
import boto3
import numpy as np
import os
from dotenv import load_dotenv
from pascal_voc_writer import Writer
import random
import speed
import time

load_dotenv(dotenv_path="../.env")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
SRC_IMG_FOLDER = os.getenv('AWS_S3_BUCKET_ANNOTATIONS_FOLDER')
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

client = boto3.client('s3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'))

'''
Initializes the classmap of concept names to training id's.
(these id's don't represent the conceptid's from our database)
'''
def get_classmap(concepts):
    classmap = []
    for concept in concepts:
        name = queryDB("select name from concepts where id=" + str(concept)).iloc[0]["name"]
        classmap.append([name,concepts.index(concept)])
    classmap = pd.DataFrame(classmap)
    classmap = classmap.to_dict()[0]
    return classmap

# SQL queries to the database
def queryDB(query):
    conn = psycopg2.connect(database = DB_NAME,
                        user = DB_USER,
                        password = DB_PASSWORD,
                        host = DB_HOST,
                        port = "5432")
    cur = conn.cursor()
    result = pd.read_sql_query(query, conn)
    conn.close()
    return result


def select_annotations(annotations, min_examples, selected_concepts):
    speed.update_annotation_speed()
    selected = []
    concept_count = {}

    for concept in selected_concepts:
        concept_count[concept] = 0

    group_frame = annotations.groupby(['videoid','frame_num'], sort=False)
    group_frame = [df for _, df in group_frame]
    random.shuffle(group_frame) # Shuffle BEFORE the sort

    ai_id = queryDB("SELECT id FROM users WHERE username='tracking'").id[0]
    # Give priority to frames with least amount of tracking annotations
    # And lower speed
    sort_lambda = lambda df : (df['userid'].count(ai_id), df.speed.mean())
    group_frame.sort(key=sort_lambda)

    #selects images that we'll use (each group has annotations for an image)
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
            #gets all concepts that we have too many of
            excess = list({key:value for (key,value) in concept_count.items() if value > min_examples})
            #don't save the annotation if it doens't include concept that we need more of
            if set(excess) >= set(in_annot):
                for a in in_annot:
                    concept_count[a] -= 1
                continue
        selected.append(frame)
    return selected, concept_count



# Function to download annotation data and format it for training
#   min_examples: minimum number of annotation examples for each concept
#   concepts: list of concepts that will be used
#   concept_map: a dict mapping index of concept to concept name
#   good_users: users whose annotations will be used
#   img_folder: name of the folder to hold the images
#   train_annot_file: name of training annotation csv
#   valid_annot_file: name of validation annotations csv
#   split: fraction of annotation images that willbe used for training (rest used in validation)
def download_annotations(min_examples, concepts, selected_concepts, concept_map, users, videos, img_folder, train_annot_file, valid_annot_file, split=.8):
    # Variable that represents all images already in the image folder
    existing_images = set(os.listdir(img_folder))
    
    # Get all annotations for given concepts (and child concepts) making sure that any tracking annotations originated from good users
    users = "\'" +  ','.join(str(e) for e in users) + "\'"
    videos = "\'" + ','.join(str(e) for e in videos) + "\'"
    str_concepts = "\'" + ','.join(str(e) for e in selected_concepts) + "\'"

    # To-do: change to prepared statement
    annotations = queryDB(
        f'''SELECT 
              A.id,
              image,
              videoid,
              videowidth,
              videoheight,
              conceptid,
              x1, x2, y1, y2,
              fps*timeinvideo as frame_num
            FROM annotations as A
            LEFT JOIN videos ON videos.id=videoid
            WHERE conceptid::text = ANY(string_to_array({str_concepts},','))
            AND videoid::text = ANY(string_to_array({videos},','))
            AND EXISTS ( 
                SELECT id, userid 
                FROM annotations 
                WHERE id=originalid 
                AND unsure = False
                AND userid::text = ANY(string_to_array({users},',')))
            ''')

    '''
    Returns
    selected - list of frames (frame is a group of annotations at same frame)
    concept_count - dictionary of conceptid and number of annotations within selected
    '''
    selected, concept_count = select_annotations(annotations, min_examples, selected_concepts)
    print("Concept counts: " + str(concept_count))
    print("Number of images: " + str(len(selected)))
        
    df_train_annot = pd.DataFrame()
    df_valid_annot = pd.DataFrame()
    count = 0
    failed_to_load_images = []
    for frame in selected:
        # Get image for first annotation in frame
        first = frame.iloc[0]
        image = str(first['image'])
        if ".png" not in image:
           image += ".png"
        img_location = img_folder + "/" + image

        # Check if image already exists in image folder
        if image not in existing_images:
            try:
                # try to download image. 
                obj = client.get_object(Bucket=S3_BUCKET, Key= SRC_IMG_FOLDER + str(first['image']))
                img = Image.open(obj['Body'])
                img.save(img_location)
            except:
                print("Failed to load image:" + str(first['image']))
                failed_to_load_images.append(str(first['id']))
                continue

        # Make training and testing csv files
        for index, row in frame.iterrows():
            concept_index = concepts.index(row['conceptid'])
            if (int(row['videowidth']) != int(first['videowidth'])):
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
                print("Invalid BBox:" + first['image'])
                continue
            if count < len(selected) * split:
                df_train_annot = df_train_annot.append([[
                    img_location,
                    x1,
                    y1,
                    x2,
                    y2,
                    concept_map[concept_index]]])
            else:
                df_valid_annot = df_valid_annot.append([[
                    img_location,
                    x1,
                    y1,
                    x2,
                    y2,
                    concept_map[concept_index]]])
        count += 1

    pd.DataFrame({'Missing_Image_Annotation_ID': failed_to_load_images}).to_csv(time.ctime()+'missing_images.csv')
    df_train_annot.to_csv(path_or_buf=train_annot_file, header=False, index=False)
    df_valid_annot.to_csv(path_or_buf=valid_annot_file, header=False, index=False)


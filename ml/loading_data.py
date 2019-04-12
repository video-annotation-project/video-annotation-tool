#!/usr/bin/env python

# Initial package imports
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

load_dotenv(dotenv_path="../.env")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
SRC_IMG_FOLDER = os.getenv('AWS_S3_BUCKET_ANNOTATIONS_FOLDER')
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

FPS = 29.97002997002997


client = boto3.client('s3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'))


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

# Function to download annotation data and format it for training
#   min_examples: minimum number of annotation examples for each concept
#   concepts: list of concepts that will be used
#   concept_map: a dict mapping index of concept to concept name
#   bad_users: users whose annotations will be ignored
#   img_folder: name of the folder to hold the images
#   train_annot_file: name of training annotation csv
#   valid_annot_file: name of validation annotations csv
#   split: fraction of annotation images that willbe used for training (rest used in validation)
def download_annotations(min_examples, concepts, concept_map, bad_users, img_folder, train_annot_file, valid_annot_file, split=.8):
    annotations = queryDB("select * from annotations as temp where conceptid in " + 
                           str(tuple(concepts)) + 
                           "and exists (select id, userid from annotations WHERE id=temp.originalid and userid not in " + 
                           str(tuple(bad_users)) + ")")

    annotation['frame_num'] = np.rint(annotations['timeinvideo'] * FPS)
    groups = annotations.groupby(['videoid','frame_num'], sort=False)
    groups = [df for _, df in groups]
    random.shuffle(groups)
    selected = [] # selected images to ensure that we reach the minimum
    concept_count = {}
    for concept in concepts:
        concept_count[concept] = 0
    
    #selects images that we'll use (each group has annotations for an image)
    for group in groups:
        if not any(v < min_examples for v in concept_count.values()):
            break
        in_annot = []
        for index, row in group.iterrows():
            concept_count[row['conceptid']] += 1
            in_annot.append(row['conceptid'])
        #checks if we have more of one concept than we want
        if any(v > min_examples for v in concept_count.values()):
            #gets all concepts that we have to many of
            excess = list({key:value for (key,value) in concept_count.items() if value > min_examples})
            #don't save the annotation if it doens't include concept that we need more of
            if set(excess) >= set(in_annot):
                for a in in_annot:
                    concept_count[a] -= 1
                continue
        selected.append(group)
    print("Concept counts: " + str(concept_count))
    print("Number of images: " + str(len(selected)))
        
    df_train_annot = pd.DataFrame()
    df_valid_annot = pd.DataFrame()
    count = 0
    for group in selected:
        first = group.iloc[0]
        img_location = img_folder + "/" + first['image']
        if ".png" not in img_location:
           img_location += ".png"
        
        try:
            # try to download image. 
            obj = client.get_object(Bucket=S3_BUCKET, Key= SRC_IMG_FOLDER +first['image'])
            img = Image.open(obj['Body'])
            img.save(img_location)
        except:
            print("Failed to load image:" + first['image'])
            continue

        for index, row in group.iterrows():
            concept_index = concepts.index(row['conceptid'])
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

    df_train_annot.to_csv(path_or_buf=train_annot_file, header=False, index=False)
    df_valid_annot.to_csv(path_or_buf=valid_annot_file, header=False, index=False)


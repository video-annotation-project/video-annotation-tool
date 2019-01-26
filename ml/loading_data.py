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
#   bad_users: users whose annotations will be ignored
#   split: fraction of annotation images that willbe used for training (rest used in validation)
def download_annotations(min_examples, concepts, bad_users, split=.8):
    annotations = queryDB("select * from annotations A1 where conceptid in " + 
                          str(tuple(concepts))+ " and userid not in " + 
                          str(tuple(bad_users)))
    groups = annotations.groupby(['videoid','timeinvideo'], sort=False)
    groups = [df for _, df in groups]
    random.shuffle(groups)
    selected = []
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
        
    count = 0
    folder = 'train'
    for group in selected:
        first = group.iloc[0]
        img_location = folder + "_image_folder/" + first['image']
        if ".png" not in img_location:
           img_location += ".png"
        
        #create voc writer
        writer = Writer(img_location, int(first['videowidth']), int(first['videoheight']))
        
        for index, row in group.iterrows():
            writer.addObject(row['conceptid'], 
                int(row['x1']), 
                int(row['y1']), 
                int(row['x2']), 
                int(row['y2']))
        
        #download image
        obj = client.get_object(Bucket=S3_BUCKET, Key= SRC_IMG_FOLDER +first['image'])
        img = Image.open(obj['Body'])
        img.save(img_location)
        
        writer.save(folder + '_annot_folder/' + first['image'][:-3] + "xml")
        count += 1
        
        if count >= len(selected) * split:
            folder = 'valid'
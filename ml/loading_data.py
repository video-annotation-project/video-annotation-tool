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


load_dotenv(dotenv_path="../.env")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
SRC_IMG_FOLDER = 'test'
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")

# DO NOT PUSH PASSWORD 
#DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PASSWORD = '2yG5$A#LkJkvnWh*'


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

annotations = queryDB("select * from annotations where conceptid in (383,2136,236,1948,347) limit 1000")
annotations.head()

def format_annotations(annotations, split=.8, img_folder='test'):
    annotations.sample(frac=1)
    count = 0
    folder = 'train'
    groups = annotations.groupby(['videoid','timeinvideo'])
    for name,group in groups:
        first = group.iloc[0]
        img_location = folder + "_image_folder/" + first['image']
        if ".png" not in img_location:
           img_location += ".png"
        
        #download image
        obj = client.get_object(Bucket=S3_BUCKET, Key= SRC_IMG_FOLDER + "/" +first['image'])
        img = Image.open(obj['Body'])
        img.save(img_location)
        
        #create voc writer
        writer = Writer(img_location, int(first['videowidth']), int(first['videoheight']))

        for index, row in group.iterrows():
            writer.addObject(row['conceptid'], 
                int(row['x1']), 
                int(row['y1']), 
                int(row['x2']), 
                int(row['y2']))
            
        writer.save(folder + '_annot_folder/' + first['image'][:-3] + "xml")
        count += 1
        if(count > len(groups) * split):
            folder = 'valid'

format_annotations(annotations)

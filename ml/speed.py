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
import math

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

def main():
   get_annotation_speed([7,8,9,10,14,4,5,19])

def get_annotation_speed(bad_users):
    conn = psycopg2.connect(database = DB_NAME,
                        user = DB_USER,
                        password = DB_PASSWORD,
                        host = DB_HOST,
                        port = "5432")
    cur = conn.cursor()
    bad_users.append(17) # dont get opencv tracking annotations
    # get human annotations that haven't had speed calculated yet
    query = "SELECT * FROM annotations WHERE speed IS NULL AND userid NOT IN " + str(tuple(bad_users))
    df = pd.read_sql_query(query, conn)
    for index, row in df.iterrows():
        # get tracking annotations within 1 sec before and after original annot (including original annot)
       query = "SELECT * FROM annotations WHERE originalid=%d AND timeinvideo BETWEEN %f AND %f" % (row.id, row.timeinvideo - 1, row.timeinvideo + 1)
       tracking_annots = pd.read_sql_query(query, conn)
       if tracking_annots.empty: # tracking not done on this annotation
          continue
       # get max distance traveled between all consecutive frames between -1/+1 sec
       max_dist = 0
       x1_array = tracking_annots.x1.values
       x2_array = tracking_annots.x2.values
       y1_array = tracking_annots.y1.values
       y2_array = tracking_annots.y2.values
       # resize tracking bounding boxes to match original 
       # annotation dimensions if video is not 1280x720
       # (all tracking annotations are stored as 1280x720 frames)
       if (row.videowidth != 1280 or row.videoheight != 720): 
          x1_array = (x1_array / 1280) * row.videowidth
          x2_array = (x2_array / 1280) * row.videowidth
          y1_array = (y1_array / 720) * row.videoheight
          y2_array = (y2_array / 720) * row.videoheight
       for i in range(0, len(x1_array) - 1):
          (x1, y1) = get_center(x1_array[i], x2_array[i], y1_array[i], y2_array[i])
          (x2, y2) = get_center(x1_array[i+1], x2_array[i+1], y1_array[i+1], y2_array[i+1])
          dist = round(math.sqrt( (x2 - x1)**2 + (y2 - y1)**2 ), 2)
          if dist > max_dist:
             max_dist = dist
       statement = "UPDATE annotations SET speed=%f WHERE id=%d;" % (max_dist, row.id)
       try:
          cur = conn.cursor()
          cur.execute(statement)
          conn.commit()
       except psycopg2.Error:
          print("Error - Couldn't update speed for annotation id=" + str(row.id))
       print(row.id, max_dist)

def get_center(x1, x2, y1, y2):
   return (((x2 - x1) / 2) + x1, ((y2 - y1) / 2) + y1)


if __name__ == '__main__':
   main()

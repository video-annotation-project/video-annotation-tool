#!/usr/bin/env python

# Initial package imports
from psycopg2 import connect
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

def main():
   get_annotation_speed([7,8,9,10,14,4,5,19])


def get_annotation_speed(bad_users):
    conn = connect(database = DB_NAME,
                        user = DB_USER,
                        password = DB_PASSWORD,
                        host = DB_HOST,
                        port = "5432")
    cur = conn.cursor()
    bad_users.append(17) # dont get opencv tracking annotations
    # get human annotations that haven't had speed calculated yet
    rows = cur.execute("SELECT * FROM annotations WHERE speed IS NULL AND userid NOT IN " + str(tuple(bad_users)))
    print(rows)
    for human_annot in rows:
       # get tracking annotations within 1 sec after original annot
       tracking_annots = cur.execute("SELECT * FROM annotations WHERE userid=17 AND originalid=%d AND timeinvideo BETWEEN %f AND %f" % (human_annot.id, human_annot.timeinvideo, human_annot.timeinvideo + 1))
       for annot in tracking_annots:
          print(annot)





if __name__ == '__main__':
   main()


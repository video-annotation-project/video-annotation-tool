from skimage.measure import compare_ssim
import imutils
import cv2
from pgdb import Connection as connect
import boto3
import os
from dotenv import load_dotenv
import datetime
import copy
import time
import uuid
import sys
import math
from PIL import Image
import numpy as np
import pandas as pd
from multiprocessing import Pool


#Load environment variables
load_dotenv(dotenv_path="./.env")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id = AWS_ACCESS_KEY_ID, aws_secret_access_key = AWS_SECRET_ACCESS_KEY)
S3_ANNOTATION_FOLDER = os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER")
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')
S3_TRACKING_FOLDER = os.getenv("AWS_S3_BUCKET_TRACKING_FOLDER")

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# video/image properties
LENGTH = 2000 # length of video in milliseconds
VIDEO_WIDTH = 1600
VIDEO_HEIGHT = 900

def main():
    offsets = []

    con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
    cursor = con.cursor()

    cursor.execute(
     'SELECT \
       videoid, timeinvideo, image, id \
      FROM \
        annotations \
      WHERE \
        userid!=17 \
      ORDER BY \
        random() \
      LIMIT 1'
    )

    rows = cursor.fetchall()
    con.close()

    for i in rows:
      print(i)

    with Pool() as p:
      offsets = list(p.map(get_offset, rows))

    print(offsets)

def get_offset(annotation):
   con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
   cursor = con.cursor()

   # get video name
   cursor.execute("SELECT filename FROM videos WHERE id=%s", (str(annotation[0]),))
   video_name = cursor.fetchone()[0]

   # grab video stream
   url = s3.generate_presigned_url('get_object',
            Params = {'Bucket': S3_BUCKET,
                      'Key': S3_VIDEO_FOLDER + str(video_name)},
                       ExpiresIn = 100)
   cap = cv2.VideoCapture(url)
   fps = cap.get(cv2.CAP_PROP_FPS)

   #search within +- search range seconds of original, +- frames from original annotation
   frames = 5
   search_range = 1/fps * frames

   # initialize video for grabbing frames before annotation
   cap.set(0, (annotation[1]-search_range)*1000) # tell video to start at 'start'-1 time
   
   imgs = []
   times = []
   for i in range(math.ceil(fps*search_range * 2)):
    check, vid = cap.read()
    if not check:
      print("end of video reached")
      break
    img = imutils.resize(vid, width=VIDEO_WIDTH, height=VIDEO_HEIGHT)
    time = cap.get(cv2.CAP_PROP_POS_MSEC)
    times.append(time)
    imgs.append(img)
   cap.release()

   
   # get s3 image
   try:
     obj = s3.get_object(
        Bucket=S3_BUCKET,
        Key= S3_ANNOTATION_FOLDER + annotation[2]
     )
   except:
    print("Annotation missing image.")
    return None
   img = Image.open(obj['Body'])
   img = np.asarray(img)
   img = img[:,:,:3]
   img = img[:,:,::-1]
   img = cv2.resize(img, (VIDEO_WIDTH, VIDEO_HEIGHT))

   best_score = 0
   best = None  
   for i in range(math.ceil(fps*search_range)):
    # +1 or -1
    for s in range(-1,2,2):
      index = math.ceil(fps*search_range) + i * s
      (score, diff) = compare_ssim(img, imgs[index], full=True, multichannel=True)
      if best_score < score:
        best = index
        best_score = score

      if best_score > .95:
        #cursor.execute("UPDATE annotations SET timeinvideo=%d WHERE id=%d;",(times[best]/1000, annotation[]))
        #con.commit()
        #con.close()
        #return
        return times[best]/1000 #best - math.ceil(fps*search_range)
   return  None

if __name__ == "__main__":
   main()


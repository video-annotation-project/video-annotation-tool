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
IMAGES_PER_SEC = 10
VIDEO_WIDTH = 1600
VIDEO_HEIGHT = 900

def main():
    SSIMs = []
    con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
    cursor = con.cursor()
    # This annotation has a error with the video playing after screenshot
    # So the s3 image should be correct but the timeinvideo is off
    cursor.execute(
     'SELECT \
       videoid, timeinvideo, image, id \
      FROM \
        annotations \
      WHERE \
        userid!=32 and DATE(dateannotated) between DATE(\'01/01/2019\') and DATE(\'05/18/2019\') \
      ORDER BY \
        random() \
      LIMIT 500'
    )
    
    # id=4960669'
    rows = cursor.fetchall()
    con.close()
    for row in rows:
        try:
            SSIMs.append(compareVideoFramesAndS3(row))
        except Exception as e:
            print(e)
    print("SSIM table")
    print(pd.Series(SSIMs).value_counts(bins=5))
    print("\'Good\' SSIM (SSIM>.8)")
    counts = len(SSIMs)
    print(sum(SSIM > .8 for SSIM in SSIMs)/counts)
    print("Average SSIM")
    print(np.mean(SSIMs))
            

def compareVideoFramesAndS3(annotation):
   con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
   cursor = con.cursor()

   # get video name
   cursor.execute("SELECT filename FROM videos WHERE id=%s", (str(annotation[0]),))
   video_name = cursor.fetchone()[0]
   con.close()
   # grab video stream
   url = s3.generate_presigned_url('get_object',
            Params = {'Bucket': S3_BUCKET,
                      'Key': S3_VIDEO_FOLDER + str(video_name)},
                       ExpiresIn = 100)
   cap = cv2.VideoCapture(url)
   fps = cap.get(cv2.CAP_PROP_FPS)

   # initialize video for grabbing frames before annotation
   cap.set(0, annotation[1]*1000) # tell video to start at 'start' time
   check, vid = cap.read()
   cap.release()
   vid = imutils.resize(vid, width=VIDEO_WIDTH, height=VIDEO_HEIGHT)
   
   # get s3 image
   obj = s3.get_object(
      Bucket=S3_BUCKET,
      Key= S3_ANNOTATION_FOLDER + annotation[2]
   )
   img = Image.open(obj['Body'])
   img = np.asarray(img)
   img = img[:,:,:3]
   img = img[:,:,::-1]
   #img = imutils.resize(img, width=VIDEO_WIDTH, height=VIDEO_HEIGHT)    
   img = cv2.resize(img, (VIDEO_WIDTH, VIDEO_HEIGHT)) #Fixed
   
   (score, diff) = compare_ssim(img, vid, full=True, multichannel=True)

   print("SSIM: {}".format(score))
   
   cv2.namedWindow("test")
   test = img
   while True:
      cv2.imshow('test',test)
      k = cv2.waitKey(0)
      if k == 32:
         if np.array_equal(test,img):
            test = vid
         else:
            test = img
      elif k == 27:
         cv2.destroyAllWindows()
         break
   return score
   #cv2.imwrite('annot_image.jpg', img)
   #cv2.imwrite('vid_image.jpg', vid)
   

if __name__ == "__main__":
   main()


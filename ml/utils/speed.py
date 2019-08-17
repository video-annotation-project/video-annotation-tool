import os
import math

import pandas as pd
import psycopg2
import boto3
from dotenv import load_dotenv


load_dotenv(dotenv_path="../.env")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
SRC_IMG_FOLDER = os.getenv('AWS_S3_BUCKET_ANNOTATIONS_FOLDER')
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
AI_ID = 32

client = boto3.client('s3',
                      aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                      aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'))


def connect_db():
  conn = psycopg2.connect(database=DB_NAME,
                          user=DB_USER,
                          password=DB_PASSWORD,
                          host=DB_HOST,
                          port="5432")
  return conn


def resize_boxes(videowidth, videoheight, x1_array, x2_array, y1_array, y2_array):
  x1_array = (x1_array * videowidth) / FRAME_WIDTH
  x2_array = (x2_array * videowidth) / FRAME_WIDTH
  y1_array = (y1_array * videoheight) / FRAME_HEIGHT
  y2_array = (y2_array * videoheight) / FRAME_HEIGHT
  return (x1_array, x2_array, y1_array, y2_array)


def update_annotation_speed():
  conn = connect_db()
  # get original human annotations from tracking annotations that haven't had speed calculated yet
  query = "SELECT DISTINCT originalid FROM annotations WHERE speed IS NULL AND userid=%d" % AI_ID
  df = pd.read_sql_query(query, conn)
  print("Updating speeds of tracking annotations..")
  for original_id in df.originalid:
    query = "SELECT * FROM annotations WHERE id=%d" % original_id
    original_annot = pd.read_sql_query(query, conn)
    # get tracking annotations within 1 sec before and after original annot
    query = ("SELECT * FROM annotations WHERE originalid=%d AND timeinvideo BETWEEN %f AND %f" %
             (original_id, original_annot.timeinvideo[0] - 1, original_annot.timeinvideo[0] + 1))
    tracking_annots = pd.read_sql_query(query, conn)
    if tracking_annots.empty:  # tracking not done on this annotation
      continue
    # get max distance traveled between all consecutive frames between -1/+1 sec
    max_dist = 0
    x1_array = tracking_annots.x1.values
    x2_array = tracking_annots.x2.values
    y1_array = tracking_annots.y1.values
    y2_array = tracking_annots.y2.values
    # resize tracking bounding boxes to match original  annotation dimensions if video is not 1280x720
    # (all tracking annotations are stored as 1280x720 frames)
    if (original_annot.videowidth[0] != FRAME_WIDTH or original_annot.videoheight[0] != FRAME_HEIGHT):
      videowidth = original_annot.videowidth[0]
      videoheight = original_annot.videoheight[0]
      (x1_array, x2_array, y1_array, y2_array) = \
          resize_boxes(videowidth, videoheight, x1_array, x2_array, y1_array, y2_array)
    for i in range(0, len(x1_array) - 1):
      (x1, y1) = get_center(x1_array[i], x2_array[i], y1_array[i], y2_array[i])
      (x2, y2) = get_center(x1_array[i + 1], x2_array[i + 1], y1_array[i + 1], y2_array[i + 1])
      dist = round(math.sqrt((x2 - x1)**2 + (y2 - y1)**2), 2)
      if dist > max_dist:
        max_dist = dist
    statement = ("UPDATE annotations SET speed=%f WHERE id=%d or originalid=%d;"
                 % (max_dist, original_id, original_id))
    try:
      cur = conn.cursor()
      cur.execute(statement)
      conn.commit()
    except psycopg2.Error:
      print("Error - Couldn't update speed for annotation id=" + str(original_id))
    # print(original_id, max_dist)


def get_center(x1, x2, y1, y2):
  return (((x2 - x1) / 2) + x1, ((y2 - y1) / 2) + y1)

# import the necessary packages
from imutils.video import VideoStream
import imutils
import cv2
from pgdb import connect
import boto3
import os
from dotenv import load_dotenv
import datetime
import copy
import time
import uuid
import sys
import math

#Load environment variables
load_dotenv(dotenv_path=".env")
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

con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
cursor = con.cursor()

# get video name
cursor.execute("SELECT filename FROM videos")
for video in  cursor.fetchall():
	# grab video stream
	url = s3.generate_presigned_url(
		'get_object', 
        	Params = {'Bucket': S3_BUCKET,'Key': S3_VIDEO_FOLDER + video.filename}, 
        	ExpiresIn = 100)
	cap = cv2.VideoCapture(url)
	fps = cap.get(cv2.CAP_PROP_FPS)
	query = "update videos set fps = " + str(fps) + " where filename = '"+ str(video.filename) + "'"
	cursor.execute(query)

con.commit()
con.close()    



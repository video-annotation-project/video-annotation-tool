import os

import cv2
import boto3
from dotenv import load_dotenv
from pgdb import connect
import config
from query import cursor, s3, con

# get video name
cursor.execute("SELECT filename FROM videos where fps is NULL")
for video in cursor.fetchall():
    # grab video stream
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': config.S3_BUCKET,
                'Key': config.S3_VIDEO_FOLDER + video.filename},
        ExpiresIn=100)
    cap = cv2.VideoCapture(url)
    fps = cap.get(cv2.CAP_PROP_FPS)
    query = "update videos set fps = " + \
        str(fps) + " where filename = '" + str(video.filename) + "'"
    cursor.execute(query)

con.commit()

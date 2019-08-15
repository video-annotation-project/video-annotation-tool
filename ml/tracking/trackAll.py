from pgdb import connect
import os
from dotenv import load_dotenv
import tracking
from multiprocessing import Pool
import boto3
import datetime
import math
import json

load_dotenv(dotenv_path="../../.env")

# aws stuff
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY_ID,
                  aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

config_path = "../../config.json"
with open(config_path) as config_buffer:
    config = json.loads(config_buffer.read())['ml']

tracking_users = config['tracking_users']


def annotationMap(id, conceptid, timeinvideo, videoid, image,
                  videowidth, videoheight, x1, y1, x2, y2, comment, unsure):
    con = connect(database=DB_NAME, host=DB_HOST,
                  user=DB_USER, password=DB_PASSWORD)
    cursor = con.cursor()
    '''
    results = s3.list_objects(
        Bucket=S3_BUCKET, Prefix=S3_VIDEO_FOLDER + str(i.id) + "_tracking.mp4")
    if 'Contents' in results:
        continue
    '''
    tracking.track_annotation(id, conceptid, timeinvideo, videoid, image,
                              videowidth, videoheight, x1, y1, x2, y2, comment, unsure)
    # Update originalid so while loop doesn't reset tracking
    cursor.execute("UPDATE annotations SET originalid=%d WHERE id=%d;",
                   (id, id,))
    con.commit()
    con.close()
    return


while True:
    con = connect(database=DB_NAME, host=DB_HOST,
                  user=DB_USER, password=DB_PASSWORD)
    cursor = con.cursor()
    # get annotations from test
    cursor.execute(f'''
        SELECT
            id, conceptid, timeinvideo, videoid, image,
            videowidth, videoheight, x1, y1, x2, y2,
            comment, unsure
        FROM annotations 
        WHERE originalid is NULL
        AND userid in {str(tuple(tracking_users))}
    ''')

    print("Tracking " + str(cursor.rowcount) + " annotations.")
    with Pool() as p:
        p.starmap(annotationMap, map(
            lambda x: (
                x.id, x.conceptid, x.timeinvideo, x.videoid,
                x.image, x.videowidth, x.videoheight,
                x.x1, x.y1, x.x2, x.y2, x.comment, x.unsure), cursor.fetchall()))
    con.close()

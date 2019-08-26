from pgdb import connect
import os
from dotenv import load_dotenv

from multiprocessing import Pool
import boto3
import datetime
import math
import json

from config.config import TRACKING_USERS
from tracking import tracking
from utils.query import con, cursor


def annotationMap(id, conceptid, timeinvideo, videoid, image,
                  videowidth, videoheight, x1, y1, x2, y2, comment, unsure):
    '''
    results = s3.list_objects(
        Bucket=S3_BUCKET, Prefix=S3_VIDEO_FOLDER + str(i.id) + "_tracking.mp4")
    if 'Contents' in results:
        continue
    '''
    status = tracking.track_annotation(id, conceptid, timeinvideo, videoid, image,
                              videowidth, videoheight, x1, y1, x2, y2, comment, unsure)
    # If something went wrong break
    if not status:
        print("Something went wrong with annotation id: ", id)
        return

    # Update originalid so while loop doesn't reset tracking
    cursor.execute("UPDATE annotations SET originalid=%d WHERE id=%d;",
                   (id, id,))
    con.commit()
    con.close()
    return


while True:
    # get annotations from test
    cursor.execute(f'''
        SELECT
            id, conceptid, timeinvideo, videoid, image,
            videowidth, videoheight, x1, y1, x2, y2,
            comment, unsure
        FROM annotations 
        WHERE originalid is NULL
        AND userid in {str(tuple(TRACKING_USERS))}
    ''')

    print("Tracking " + str(cursor.rowcount) + " annotations.")
    with Pool() as p:
        p.starmap(annotationMap, map(
            lambda x: (x), cursor.fetchall()))
    con.close()

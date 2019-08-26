from pgdb import connect
import os
from dotenv import load_dotenv

from multiprocessing import Pool
import boto3
import datetime
import math
import json

from config import config
from tracking import tracking
from utils.query import con, cursor


def annotationMap(id, conceptid, timeinvideo, videoid, image,
                  videowidth, videoheight, x1, y1, x2, y2, comment, unsure)
    status = tracking.track_annotation(id, conceptid, timeinvideo, videoid, image,
                              videowidth, videoheight, x1, y1, x2, y2, comment, unsure)
    if not status:
        print("Something went wrong with annotation id: ", id)
        return

    # Update originalid so while loop doesn't reset tracking
    cursor.execute("UPDATE annotations SET originalid=%d WHERE id=%d;",
                   (id, id,))
    con.commit()
    return


while True:
    # get annotations without tracking
    cursor.execute(f'''
        SELECT
            id, conceptid, timeinvideo, videoid, image,
            videowidth, videoheight, x1, y1, x2, y2,
            comment, unsure
        FROM annotations 
        WHERE originalid is NULL
        AND userid in {str(tuple(TRACKING_USERS))}
    ''')

    print(f"Tracking {str(cursor.rowcount)} annotations.")
    with Pool() as p:
        p.starmap(annotationMap, map(
            lambda x: (
                x.id, x.conceptid, x.timeinvideo, x.videoid,
                x.image, x.videowidth, x.videoheight,
                x.x1, x.y1, x.x2, x.y2, x.comment, x.unsure), cursor.fetchall()))
    con.close()

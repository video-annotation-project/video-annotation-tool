from pgdb import connect
from multiprocessing import Pool
import datetime
import math
import json

from config.config import TRACKING_USERS, DB_HOST, DB_NAME, DB_PASSWORD, DB_USER
from tracking import tracking


def annotationMap(id, conceptid, timeinvideo, videoid, image,
                  videowidth, videoheight, x1, y1, x2, y2, comment, unsure):
    con = connect(database=DB_NAME, host=DB_HOST,
                  user=DB_USER, password=DB_PASSWORD)
    cursor = con.cursor()
    status = tracking.track_annotation(id, conceptid, timeinvideo, videoid, image,
                                       videowidth, videoheight, x1, y1, x2, y2, comment, unsure)
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
    con = connect(database=DB_NAME, host=DB_HOST,
                  user=DB_USER, password=DB_PASSWORD)
    cursor = con.cursor()
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
            lambda x: x, cursor.fetchall()))
    con.close()

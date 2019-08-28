from multiprocessing import Pool
import datetime
import math
import json

from config.config import TRACKING_USERS
from tracking import tracking
from utils.query import con, cursor


def annotationMap(id, conceptid, timeinvideo, videoid, image,
                  videowidth, videoheight, x1, y1, x2, y2, comment, unsure):
    status = tracking.track_annotation(id, conceptid, timeinvideo, videoid, image,
                                       videowidth, videoheight, x1, y1, x2, y2, comment, unsure)
    if not status:
        print("Something went wrong with annotation id: ", id)
        return

    # Update originalid so while loop doesn't reset tracking
    cursor.execute("UPDATE annotations SET originalid=%s WHERE id=%s;",
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
            lambda x: x, cursor.fetchall()))
    con.close()

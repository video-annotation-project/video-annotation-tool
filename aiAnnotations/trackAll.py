from pgdb import connect
import os
from dotenv import load_dotenv
import tracking
from multiprocessing import Process, active_children, cpu_count
import boto3
import datetime
import math
import json

load_dotenv(dotenv_path="../.env")

# aws stuff
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id = AWS_ACCESS_KEY_ID, aws_secret_access_key = AWS_SECRET_ACCESS_KEY)
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

while True:
    con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
    cursor = con.cursor()
    # get annotations from test
    cursor.execute("SELECT * FROM annotations WHERE originalid IS NULL")
    rows = cursor.fetchall()

    processes = []
    print("Annotating " + str(len(rows)) + " videos.")
    for count, i in enumerate(rows):
        print("Working annotation: " + str(count))
        results = s3.list_objects(Bucket=S3_BUCKET, Prefix=S3_VIDEO_FOLDER + str(i.id) + "_tracking.mp4")
        if 'Contents' in results:
            continue
        process = Process(target=tracking.track_annotation, args=(i,))
        process.start()
        processes.append((process,i.id))
        
        while(len(active_children()) >= cpu_count()-1):
            pass
        
        if(len(processes) > 256):
            for p, originid in processes:
                p.join()
            processes = []

    for p, originid in processes:
        p.join()

    for i in rows:
        results = s3.list_objects(Bucket=S3_BUCKET, Prefix=S3_VIDEO_FOLDER + str(i.id) + "_tracking.mp4")
        if 'Contents' not in results:
            print("Failed on video for annotation: " + str(i.id))
        cursor.execute("UPDATE annotations SET originalid=%d WHERE id=%d;",(i.id, i.id,))
    con.commit()
    con.close()    

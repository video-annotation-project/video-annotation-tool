from psycopg2 import connect
import os
from dotenv import load_dotenv
from predict import predict_on_video
import boto3
import json

load_dotenv(dotenv_path="../.env")

# aws stuff
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id = AWS_ACCESS_KEY_ID, aws_secret_access_key = AWS_SECRET_ACCESS_KEY)
S3_ANNOTATION_FOLDER = os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER")
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')
S3_TRACKING_FOLDER = os.getenv("AWS_S3_BUCKET_TRACKING_FOLDER")
S3_WEIGHTS_FOLDER = os.getenv("ASW_S3_BUCKET_WEIGHTS_FOLDER")
# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
cursor = con.cursor()
# get annotations from test
cursor.execute("SELECT * FROM MODELTAB")
row = cursor.fetchone()
info = row[1]

if info['activeStep'] != 3:
    exit()

s3.download_file(S3_BUCKET, S3_WEIGHTS_FOLDER + str(info['modelSelected']) + '.h5', 'current_weights.h5')

cursor.execute("SELECT * FROM MODELS WHERE name='" + str(info['modelSelected']) + "'")
model = cursor.fetchone()

predict_on_video(int(info['videoSelected']), 'current_weights.h5', model[2], upload_annotations=True, userid=int(info['userSelected']))

cursor.execute("Update modeltab SET info =  '{\"activeStep\": 0, \"modelSelected\":\"\",\"videoSelected\":\"\",\"userSelected\":\"\"}' WHERE option = 'runmodel'")
con.commit()
con.close()    
os.system("sudo shutdown -h")

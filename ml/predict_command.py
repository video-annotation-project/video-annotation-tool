from psycopg2 import connect
import os
from dotenv import load_dotenv
from predict import predict_on_video
import boto3
import json
import config
from utils.query import s3, con, cursor

load_dotenv(dotenv_path="../.env")

# AWS
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
S3_WEIGHTS_FOLDER = os.getenv("AWS_S3_BUCKET_WEIGHTS_FOLDER")

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# get annotations from test
cursor.execute("SELECT * FROM MODELTAB WHERE option='runmodel'")
info = cursor.fetchone()[1]
if info['activeStep'] != 3:
    exit()

model_name = str(info['modelSelected'])
s3.download_file(S3_BUCKET, S3_WEIGHTS_FOLDER +
                 model_name + '.h5', config.WEIGHTS_PATH)

cursor.execute("SELECT * FROM MODELS WHERE name='" + model_name + "'")
model = cursor.fetchone()
videoid = int(info['videoSelected'])
concepts = model[2]
userid = int(info['userSelected'])

predict_on_video(videoid, config.WEIGHTS_PATH, concepts, upload_annotations=True, userid)

cursor.execute(
    "Update modeltab SET info =  '{\"activeStep\": 0, \"modelSelected\":\"\",\"videoSelected\":\"\",\"userSelected\":\"\"}' WHERE option = 'predictmodel'")
con.commit()
con.close()
os.system("sudo shutdown -h")

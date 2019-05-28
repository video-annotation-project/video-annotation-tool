from psycopg2 import connect
import os
from dotenv import load_dotenv
from load_n_train import train_model
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
cursor.execute("SELECT * FROM MODELTAB WHERE option='trainmodel'")
row = cursor.fetchone()
info = row[1]

if info['activeStep'] != 4:
    exit()

cursor.execute("SELECT * FROM MODELS WHERE name='" + str(info['modelSelected']) + "'")
model = cursor.fetchone()

train_model(model[2], info['usersSelected'], info['minImages'], info['epochs'], info['modelSelected'], download_data=True)

cursor.execute("Update modeltab SET info =  '{\"activeStep\": 0, \"epochs\":0, \"minImages\":0, \"modelSelected\":\"\",\"videosSelected\":[],\"usersSelected\":[]}' WHERE option = 'trainmodel'")
con.commit()
con.close()    
os.system("sudo shutdown -h")

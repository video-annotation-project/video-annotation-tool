from psycopg2 import connect
import os
from dotenv import load_dotenv
from load_n_train import train_model
import boto3
import json

config_path = "../config.json"
load_dotenv(dotenv_path="../.env")
with open(config_path) as config_buffer:    
    config = json.loads(config_buffer.read())['ml']

weights_path = config['weights_path']
default_weights = config['default_weights']
print(default_weights)


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

if info['activeStep'] != 5:
    exit()

try:
	s3.download_file(S3_BUCKET, S3_WEIGHTS_FOLDER + str(info['modelSelected']) + '.h5', weights_path )
except:
	s3.download_file(S3_BUCKET, S3_WEIGHTS_FOLDER + default_weights, weights_path)



cursor.execute("SELECT * FROM MODELS WHERE name='" + str(info['modelSelected']) + "'")
model = cursor.fetchone()
concepts = model[2]
train_model(concepts, info['usersSelected'], int(info['minImages']), int(info['epochs']), info['modelSelected'], info['videosSelected'], info['conceptsSelected'], download_data=True)

cursor.execute("Update modeltab SET info =  '{\"activeStep\": 0, \"conceptsSelected\":[], \"epochs\":0, \"minImages\":0, \"modelSelected\":\"\",\"videosSelected\":[],\"usersSelected\":[]}' WHERE option = 'trainmodel'")
con.commit()
con.close()    
os.system("sudo shutdown -h")

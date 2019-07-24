from psycopg2 import connect
import os
from dotenv import load_dotenv
from train import train_model
import boto3
import json
import time
from evaluate_prediction_vid import evaluate
from multiprocessing import Pool

config_path = "../config.json"
load_dotenv(dotenv_path="../.env")
with open(config_path) as config_buffer:    
    config = json.loads(config_buffer.read())['ml']

weights_path = config['weights_path']
default_weights = config['default_weights']

# aws stuff
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client(
    's3', aws_access_key_id = AWS_ACCESS_KEY_ID,
     aws_secret_access_key = AWS_SECRET_ACCESS_KEY)
S3_ANNOTATION_FOLDER = os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER")
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')
S3_TRACKING_FOLDER = os.getenv("AWS_S3_BUCKET_TRACKING_FOLDER")
S3_WEIGHTS_FOLDER = os.getenv("AWS_S3_BUCKET_WEIGHTS_FOLDER")

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

con = connect(
    database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
cursor = con.cursor()

# Delete old prediction progress
cursor.execute('''
    DELETE FROM
      predict_progress
''')
con.commit()

# get annotations from test
cursor.execute("SELECT * FROM MODELTAB WHERE option='trainmodel'")
row = cursor.fetchone()
info = row[1]

try:
	s3.download_file(
        S3_BUCKET, S3_WEIGHTS_FOLDER + str(info['modelSelected']) + '.h5',
        weights_path)
except:
	s3.download_file(
        S3_BUCKET, S3_WEIGHTS_FOLDER + default_weights, weights_path)

cursor.execute('''
    SELECT *
    FROM MODELS
    WHERE name=%s''',(info['modelSelected'],))
model = cursor.fetchone()
concepts = model[2]
verifyVideos = model[3]

#Delete old model user
# if (model[4] != 'None'):
#      cursor.execute('''
#          DELETE FROM users
#          WHERE id=%s''',
#          (model[4],))

user_model = model[0] + "-" + time.ctime() 
# username example: testV2-Fri Jun 28 11:58:37 2019
# insert into users
# cursor.execute('''
#     INSERT INTO users (username, password, admin) 
#     VALUES (%s, 0, null) 
#     RETURNING *''',
#     (user_model,))
# model_user_id = int(cursor.fetchone()[0])

# update models
# cursor.execute('''
#     UPDATE models 
#     SET userid=%s
#     WHERE name=%s
#     RETURNING *''',
#     (model_user_id, info['modelSelected'],))

# Start training job
train_model(concepts, info['modelSelected'], info['annotationCollections'], 
           int(info['minImages']), int(info['epochs']), download_data=True)


# Run verifyVideos in parallel
# with Pool(processes = 2) as p:
#     p.starmap(evaluate, map(lambda video: (video, user_model, concepts), verifyVideos))

# Run evaluate on all the videos in verifyVideos
for video_id in verifyVideos: # Using for loop due to memory issues
    evaluate(video_id, user_model, concepts)
    cursor.execute('''
        DELETE FROM predict_progress
        ''')

os.system('rm *.mp4')
cursor.execute('''
    Update modeltab 
    SET info =  '{
        \"activeStep\": 0, \"modelSelected\":\"\", \"annotationCollections\":[],
        \"epochs\":0, \"minImages\":0}' 
    WHERE option = 'trainmodel'
''')
con.commit()
con.close()    
os.system("sudo shutdown -h")

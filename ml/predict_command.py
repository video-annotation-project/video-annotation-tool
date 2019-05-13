from pgdb import connect
import os
from dotenv import load_dotenv
import aiAnnotate
from predict import predict_on_video
import boto3

load_dotenv(dotenv_path="../.env")

# aws stuff
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id = AWS_ACCESS_KEY_ID, aws_secret_access_key = AWS_SECRET_ACCESS_KEY)
S3_ANNOTATION_FOLDER = os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER")
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')
S3_TRACKING_FOLDER = os.getenv("AWS_S3_BUCKET_TRACKING_FOLDER")

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
cursor = con.cursor()
# get annotations from test
cursor.execute("SELECT * FROM MODELS WHERE video IS NOT NULL")
rows = cursor.fetchall()
con.close()    

for row in rows:
    weights = s3.get_object(Bucket=S3_BUCKET, Key= SRC_IMG_FOLDER +first['image'])
    download_file(S3_BUCKET, 'weights/' + row.name + '.h5', 'current_weights.h5')
    predict_on_video(row.video, 'current_weights.h5', row.concepts, upload_annotations=True, userid=row.userid)





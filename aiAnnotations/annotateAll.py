from pgdb import connect
import os
from dotenv import load_dotenv
import aiAnnotate
from multiprocessing import Process, active_children, cpu_count
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

# get annotations from Ali
cursor.execute("SELECT * FROM annotations WHERE userid=6")
rows = cursor.fetchmany(10)
con.close()

processes = []
for i in rows:
	process = Process(target=aiAnnotate.ai_annotation, args=(i,))
	process.start()
	processes.append((process,i.id))

	while(len(active_children()) >= cpu_count()*1/2):
		pass

for p, originid in processes:
	p.join()

for i in rows:
	results = s3.list_objects(Bucket=S3_BUCKET, Prefix=S3_VIDEO_FOLDER + str(i.id) + "_ai.mp4")
	if 'Contents' not in results:
		print("Failed on video for annotation: " + str(i.id))

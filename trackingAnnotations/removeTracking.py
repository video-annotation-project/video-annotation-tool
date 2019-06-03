from pgdb import connect
import boto3
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

# aws stuff
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id = AWS_ACCESS_KEY_ID, aws_secret_access_key = AWS_SECRET_ACCESS_KEY)

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
cursor = con.cursor()

#Get ai userid
cursor.execute("SELECT id FROM users WHERE username=%s", ("tracing",))
TRACKING_ID = cursor.fetchone().id

#removes all tracking annotations from psql table
cursor.execute("DELETE FROM annotations WHERE userid=%d RETURNING *",(TRACKING_ID,))
for i in cursor.fetchall():
        s3.delete_object(Bucket=S3_BUCKET, Key=os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER") + i.image)
        s3.delete_object(Bucket=S3_BUCKET, Key=os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER") + i.imagewithbox)
        s3.delete_object(Bucket=S3_BUCKET, Key=os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER') + str(i.originalid) + "_tracking.mp4")
        cursor.execute("UPDATE annotations SET originalid=null WHERE id=%d;",(i.originalid,))
        print(i)
con.commit()
con.close()



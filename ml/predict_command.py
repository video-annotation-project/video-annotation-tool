from psycopg2 import connect
import subprocess
from dotenv import load_dotenv
from predict import predict_on_video
import boto3
import json
import config.config
from utils.query import s3, con, cursor
from config import S3_BUCKET, S3_WEIGHTS_FOLDER, WEIGHTS_PATH

'''
get predict params
returns a list elements:
model - string: name of the model
userid - int: model's userid
concepts - int[]: list of concept ids model is trying to find
video - int: id of video to predict on
upload_annotations - boolean: if true upload annotations to database
'''
cursor.execute("SELECT * FROM predict_params")
params = cursor.fetchone()
model_name = str(params[0])
userid = int(params[1])
concepts = params[2]
videoid = int(params[3])
upload_annotations = bool(params[4])

s3.download_file(S3_BUCKET, S3_WEIGHTS_FOLDER +
                 model_name + '.h5', WEIGHTS_PATH)

predict_on_video(videoid, WEIGHTS_PATH, concepts,
                 upload_annotations=upload_annotations, userid=userid)

cursor.execute(
    "Update modeltab SET info =  '{\"activeStep\": 0, \"modelSelected\":\"\",\"videoSelected\":\"\",\"userSelected\":\"\"}' WHERE option = 'predictmodel'")
con.commit()
con.close()
subprocess.call(["sudo", "shutdown", "-h"])

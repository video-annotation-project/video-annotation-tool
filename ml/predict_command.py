from psycopg2 import connect
import subprocess
from dotenv import load_dotenv
from predict import predict_on_video
import boto3
import json
import config.config
from utils.query import s3, con, cursor
from config import S3_BUCKET, S3_WEIGHTS_FOLDER, WEIGHTS_PATH

# get annotations from test
cursor.execute("SELECT * FROM MODELTAB WHERE option='runmodel'")
info = cursor.fetchone()[1]
if info['activeStep'] != 3:
    exit()

model_name = str(info['modelSelected'])
s3.download_file(S3_BUCKET, S3_WEIGHTS_FOLDER +
                 model_name + '.h5', WEIGHTS_PATH)

cursor.execute("SELECT * FROM MODELS WHERE name='" + model_name + "'")
model = cursor.fetchone()
videoid = int(info['videoSelected'])
concepts = model[2]
userid = int(model[4])

predict_on_video(videoid, WEIGHTS_PATH, concepts,
                 upload_annotations=True, userid=userid)

cursor.execute(
    "Update modeltab SET info =  '{\"activeStep\": 0, \"modelSelected\":\"\",\"videoSelected\":\"\",\"userSelected\":\"\"}' WHERE option = 'predictmodel'")
con.commit()
con.close()
subprocess.call(["sudo", "shutdown", "-h"])

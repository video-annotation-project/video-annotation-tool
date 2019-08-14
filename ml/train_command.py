import os
import time
import subprocess

from psycopg2 import connect
from botocore.exceptions import ClientError
import boto3

from evaluate_prediction_vid import evaluate
from train import train_model
import config

from utils.query import s3, con, cursor, pd_query

# get annotations from test
model_params = pd_query("""
    SELECT * FROM model_params WHERE option='train'""").iloc[0]

try:
    s3.download_file(
        config.S3_BUCKET,
        config.S3_WEIGHTS_FOLDER + str(model_params["model"]) + ".h5",
        config.WEIGHTS_PATH,
    )
except ClientError:
    s3.download_file(
        config.S3_BUCKET,
        config.S3_WEIGHTS_FOLDER + config.DEFAULT_WEIGHTS_PATH,
        config.WEIGHTS_PATH,
    )

model = pd_query('''SELECT * FROM models WHERE name=%s''',
                 (str(model_params['model']),)).iloc[0]

# model = cursor.fetchone()
concepts = model['concepts']
verifyVideos = model['verificationvideos']

user_model = model['name'] + "-" + time.ctime()

# Delete old model user
if model['userid'] != None:
    cursor.execute(
        """
         DELETE FROM users
         WHERE id=%s""",
        (model['userid'],),
    )

cursor.execute(
    """
    INSERT INTO users (username, password, admin)
    VALUES (%s, 0, null)
    RETURNING *""",
    (user_model,),
)
model_user_id = int(cursor.fetchone()[0])

# update models
cursor.execute(
    """
    UPDATE models
    SET userid=%s
    WHERE name=%s
    RETURNING *""",
    (model_user_id, model_params["model"]),
)

# Start training job
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
train_model(
    concepts,
    verifyVideos,
    model_params["model"],
    model_params["annotation_collections"],
    int(model_params["min_images"]),
    int(model_params["epochs"]),
    download_data=True,
    verified_only=model_params["verified_only"],
    include_tracking=model_params["include_tracking"],
)

# Run verifyVideos in parallel
# with Pool(processes = 2) as p:
#     p.starmap(evaluate, map(lambda video: (video, user_model, concepts), verifyVideos))

# Just to be sure in case of web app not deleting the progress
cursor.execute("""DELETE FROM predict_progress""")
con.commit()
# Run evaluate on all the videos in verifyVideos
# Using for loop due to memory issues
for video_id in verifyVideos:
    evaluate(video_id, user_model, concepts)

cursor.execute(
    """
    UPDATE predict_progress
    SET status=4
    """
)

subprocess.call(["rm", "*.mp4"])

cursor.execute(
    """
    Update model_params
    SET epochs = 0, min_images=0, model='', annotation_collections=ARRAY[]: : integer[],
        verified_only=null, include_tracking=null
    WHERE option='train'
    """
)

con.commit()
con.close()
subprocess.call(["sudo", "shutdown", "-h"])

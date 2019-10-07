import os
import time
import subprocess

from botocore.exceptions import ClientError

from predict.evaluate_prediction_vid import evaluate
from train.train import train_model
from config import config
from utils.query import s3, con, cursor, pd_query

# get annotations from test
model_params = pd_query(
    """
    SELECT * FROM model_params WHERE option='train'"""
).iloc[0]

model_version = str(model_params["version"])
print(f"model version: {model_version}")
model_file_version = model_version.replace(".", "-")
print(f"model file version: {model_file_version}")

if model_version != "0":
    try:
        s3.download_file(
            config.S3_BUCKET,
            config.S3_WEIGHTS_FOLDER + str(model_params["model"]) + "_" + model_file_version + ".h5",
            config.WEIGHTS_PATH,
        )
        print("downloaded file: %s", str(model_params["model"]) + "_" + model_file_version + ".h5")
    except ClientError:
        s3.download_file(
            config.S3_BUCKET,
            config.S3_WEIGHTS_FOLDER + config.DEFAULT_WEIGHTS_PATH,
            config.WEIGHTS_PATH,
        )
        print("exception occurred, downloading default weights file")
else:
    print("downloading default weights file")
    s3.download_file(
        config.S3_BUCKET,
        config.S3_WEIGHTS_FOLDER + config.DEFAULT_WEIGHTS_PATH,
        config.WEIGHTS_PATH,
    ) 

model = pd_query(
    """SELECT * FROM models WHERE name=%s""", (str(model_params["model"]),)
).iloc[0]

# model = cursor.fetchone()
concepts = model["concepts"]
verifyVideos = model["verificationvideos"]

# --- get new model version number ---

if model_version == '0':
    num_model_version = 0
else:
    num_model_version = float(model_version)

# from model_version, select versions one level down
level_down = pd_query(
    """ SELECT version FROM model_versions WHERE model='{0}' AND version ~ '{1}.*{{1}}' """.format(
        str(model_params["model"]),
        num_model_version
    )
)

num_rows = len(level_down)
if num_rows == 0:
    new_version = "'" + model_version + ".1'"
else:
    latest_version = level_down.iloc[num_rows - 1]["version"]
    last_num = int(latest_version[-1]) + 1
    new_version = "'" +  latest_version[:-1] + str(last_num) + "'"

print(f"new version: {new_version}")

# create new model-version user
user_model = model["name"] + "-" + new_version

cursor.execute(
    """
    INSERT INTO users (username, password, admin)
    VALUES (%s, 0, null)
    RETURNING *""",
    (user_model,),
)
model_user_id = int(cursor.fetchone()[0])

print("inserting row in model_versions")

# insert new version into model_versions table
cursor.execute(
    """ INSERT INTO model_versions VALUES (%d, %d, %s, %s, %r, %r, %d, %s) """,
    (
        int(model_params["epochs"]),
        int(model_params["min_images"]),
        model_params["model"],
        model_params["annotation_collections"],
        model_params["verified_only"],
        model_params["include_tracking"],
        model_user_id,
        new_version
    )
)

# reformat version name for weights filename in s3 
new_version = new_version.replace(".", "-'") 

# Start training job
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

train_model(
    concepts,
    verifyVideos,
    model_params["model"],
    new_version,
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
cursor.execute(
    """
    INSERT INTO predict_progress (videoid, current_video, total_videos)
    VALUES (%s, %s, %s)""",
    (0, 0, len(verifyVideos)),
)
con.commit()
# Run evaluate on all the videos in verifyVideos
# Using for loop due to memory issues
for video_id in verifyVideos:
    cursor.execute(
        f"""UPDATE predict_progress SET videoid = {video_id}, current_video = current_video + 1"""
    )
    con.commit()
    evaluate(video_id, user_model, concepts)

cursor.execute(
    """
    UPDATE predict_progress
    SET status=4
    """
)

con.commit()

# subprocess.call(["rm", "*.mp4"])

print("reseting model_params")
cursor.execute(
    """
    Update model_params
    SET epochs = 0, min_images=0, model='', annotation_collections=ARRAY[]: : integer[],
        verified_only=null, include_tracking=null, version=0
    WHERE option='train'
    """
)

con.commit()
con.close()
#subprocess.call(["sudo", "shutdown", "-h"])

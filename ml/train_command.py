import os
import time
import subprocess

from botocore.exceptions import ClientError

import upload_stdout
from predict.evaluate_prediction_vid import evaluate
from train.train import train_model
from config import config
from utils.query import s3, con, cursor, pd_query
from datetime import datetime

def main():
    """ We train a model and then use it to predict on the specified videos
    """
    # This process periodically uploads the stdout and stderr files
    # To the S3 bucket. The website uses these to display stdout and stderr
    pid = os.getpid()
    upload_process = upload_stdout.start_uploading(pid)
    model, model_params = get_model_and_params()
    user_model, new_version = get_user_model(model_params)
    
    create_model_user(new_version, model_params, user_model)

    # This removes all of the [INFO] outputs from tensorflow.
    # We still see [WARNING] and [ERROR], but there's a lot less clutter
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

    # If set, training will sometimes be unable to save the model
    os.environ["HDF5_USE_FILE_LOCKING"] = "FALSE"

    concepts = model["concepts"]
    verify_videos = model["verificationvideos"]

    start_training(new_version, concepts, verify_videos, model_params)
    setup_predict_progress(verify_videos)

    evaluate_videos(concepts, verify_videos, user_model)

    reset_model_params()
    shutdown_server()

def get_model_and_params():
    """ If they exist, get the selected model's old weights.
        Also grab the current training parameters from the database.
    """

    # Get annotation info from the model_params table
    model_params = pd_query(
        """
        SELECT * FROM model_params WHERE option='train'"""
    ).iloc[0]

    # Try to get the previously saved weights for the model,
    # If they don't exist (ClientError), use the default weights

    model_version = str(model_params["version"])
    model_file_version = model_version.replace(".", "-")

    print(f"model version: {model_version}")
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
            print("exception occurred, downloaded default weights file")
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

    return model, model_params

def get_user_model(model_params):
    """ Get new model version number and user_model name
    """
    model_version = str(model_params["version"])
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
        new_version = model_version + ".1"
    else:
        latest_version = level_down.iloc[num_rows - 1]["version"]
        last_num = int(latest_version[-1]) + 1
        new_version = latest_version[:-1] + str(last_num)

    print(f"new version: {new_version}")

    # create new model-version user
    user_model = model["name"] + "-" + new_version

    return user_model, new_version

def create_model_user(new_version, model_params, user_model):
    """Insert a new user for this model version, then update the model_versions table
       with the new model version
    """
    print("creating new user, updating model_versions table")
    cursor.execute(
        """
        INSERT INTO users (username, password, admin)
        VALUES (%s, 0, null)
        RETURNING *""",
        (user_model,),
    )
    con.commit()
    model_user_id = int(cursor.fetchone()[0])

    # Update the model_versions table with the new user

    cursor.execute(
        """ INSERT INTO model_versions VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) """,
        (
            int(model_params["epochs"]),
            int(model_params["min_images"]),
            model_params["model"],
            model_params["annotation_collections"],
            bool(model_params["verified_only"]),
            bool(model_params["include_tracking"]),
            model_user_id,
            new_version,
            datetime.now()
        )
    )
    con.commit()

    return model_user_id

def start_training(new_version, concepts, verify_videos, model_params):
    """Start a training job with the correct parameters
    """

    # reformat version name for weights filename in s3 
    new_version = new_version.replace(".", "-'") 
    print("training")
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

def setup_predict_progress(verify_videos):
    """Reset the predict progress table for new predictions"""

    # Just to be sure in case of web app not deleting the progress
    # we clear the prediction progress table
    cursor.execute("""DELETE FROM predict_progress""")
    con.commit()
    cursor.execute(
        """
        INSERT INTO predict_progress (videoid, current_video, total_videos)
        VALUES (%s, %s, %s)""",
        (0, 0, len(verify_videos)),
    )
    con.commit()

def evaluate_videos(concepts, verify_videos, user_model):
    """ Run evaluate on all the evaluation videos
    """

    # We go one by one as multiprocessing ran into memory issues
    for video_id in verify_videos:
        cursor.execute(
            f"""UPDATE predict_progress SET videoid = {video_id}, current_video = current_video + 1"""
        )
        con.commit()
        evaluate(video_id, user_model, concepts)

    # Status level 4 on a video means that predictions have completed.
    cursor.execute(
        """
        UPDATE predict_progress
        SET status=4
        """
    )
    con.commit()

def reset_model_params():
    """ Reset the model_params table
    """
    print("resetting model_params")
    cursor.execute(
        """
        Update model_params
        SET epochs = 0, min_images=0, model='', annotation_collections=ARRAY[]:: integer[],
            verified_only=null, include_tracking=null, version=0
        WHERE option='train'
        """
    )
    con.commit()
    con.close()

def shutdown_server():
    """ Shutdown this EC2 instance
    """

    #subprocess.call(["sudo", "shutdown", "-h"])


if __name__ == '__main__':
    main()



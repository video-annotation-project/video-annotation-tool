from psycopg2 import connect
import subprocess
from dotenv import load_dotenv
import boto3
import json
from utils.query import s3, con, cursor
from config.config import S3_BUCKET, S3_WEIGHTS_FOLDER, WEIGHTS_PATH
from train_command import setup_predict_progress, evaluate_videos, end_predictions
from botocore.exceptions import ClientError

def main():

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
    concepts = params[2]
    videoids = params[4]
    upload_annotations = bool(params[3])
    previous_run_id = int(params[5])
    version = params[6].replace(".", "-")
    user_model = model_name + "-" + version

    download_weights(model_name, version)
    setup_predict_progress(videoids)
    evaluate_videos(concepts, videoids, user_model, upload_annotations, previous_run_id)
    cleanup()

def download_weights(model_name, version):
    filename = model_name + '_' + version + '.h5'
    try:
        s3.download_file(
            S3_BUCKET,
            S3_WEIGHTS_FOLDER + filename,
            WEIGHTS_PATH
        )
        print("downloaded file: {0}".format(filename))
    except ClientError:
        print("exception occurred, could not find file {0} in S3, exiting".format(filename))
        cleanup()

def cleanup():
    end_predictions()
    con.close()
    subprocess.call(["sudo", "shutdown", "-h"])


if __name__ == '__main__':
    main()
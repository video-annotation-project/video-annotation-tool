from psycopg2 import connect
import subprocess
from dotenv import load_dotenv
import boto3
import json
from utils.query import s3, con, cursor, pd_query
from config.config import S3_BUCKET, S3_WEIGHTS_FOLDER, WEIGHTS_PATH,\
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_STDOUT_FOLDER
from train_command import setup_predict_progress, evaluate_videos, end_predictions, shutdown_server, get_conceptid_collections, get_model_and_params
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

    try:
        params = pd_query("SELECT * FROM predict_params").iloc[0]
        model, _ = get_model_and_params()
        model_name = params["model"]
        concepts = params["concepts"]
        videoids = params["videos"]
        upload_annotations = params["upload_annotations"]
        version = params["version"]
        create_collection = params["create_collection"]
        userid = get_model_userid(model_name, version)

        user_model = model_name + "-" + version
        download_weights(user_model)
        setup_predict_progress(videoids)
        evaluate_videos(concepts, videoids, user_model, upload_annotations=upload_annotations,
                        userid=userid, create_collection=create_collection, collections=get_conceptid_collections(model['concept_collections']))
    finally:
        #reset_predict_params()
        #upload_stdout_stderr()
        #shutdown_server()
        pass


def download_weights(user_model):
    filename = user_model + '.h5'
    try:
        s3.download_file(
            S3_BUCKET,
            S3_WEIGHTS_FOLDER + filename,
            WEIGHTS_PATH
        )
        print("downloaded file: {0}".format(filename))
    except ClientError as e:
        print("Could not find weights file {0} in S3".format(filename))
        raise e


def reset_predict_params():
    """ Reset the predict_params table
    """
    print("resetting model_params")
    cursor.execute(
        """
        UPDATE predict_params
        SET model='', userid=-1, concepts=ARRAY[]::integer[],
            upload_annotations=false, videos=ARRAY[]::integer[],
            version='0', create_collection=false
        """
    )
    con.commit()


def upload_stdout_stderr():
    STDOUT_FILE = "results_pred.txt"
    STDERR_FILE = "error_pred.txt"

    client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )
    client.upload_file(STDOUT_FILE, S3_BUCKET, f'{S3_STDOUT_FOLDER}{STDOUT_FILE}')
    client.upload_file(STDERR_FILE, S3_BUCKET, f'{S3_STDOUT_FOLDER}{STDERR_FILE}')


def get_model_userid(name, version):
    return int(pd_query("SELECT userid FROM model_versions WHERE "
                        f"model='{name}' AND version='{version}'")\
               .iloc[0]['userid'])


if __name__ == '__main__':
    main()

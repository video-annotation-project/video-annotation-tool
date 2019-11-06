from psycopg2 import connect
import subprocess
from dotenv import load_dotenv
import boto3
import json
from utils.query import s3, con, cursor
from config.config import S3_BUCKET, S3_WEIGHTS_FOLDER, WEIGHTS_PATH
from train_command import setup_predict_progress, evaluate_videos, end_predictions, shutdown_server
from botocore.exceptions import ClientError


def main():
    (model_name, concepts, video_ids, upload_annotations, version, 
    create_collection = get_predict_params())
    predict(model_name, concepts, video_ids, upload_annotations, version, 
    create_collection)

def get_predict_params():
    '''
    get predict params
    model - string: name of the model
    concepts - int[]: list of concept ids model is trying to find
    video_ids - int[]: list of video ids model is trying to predict on
    upload_annotations - boolean: if true upload annotations to database
    version - string: model version
    create_collection - boolean: if true create annotation collection
    '''
    cursor.execute("SELECT * FROM predict_params")
    params = cursor.fetchone()
    model_name = str(params[0])
    concepts = params[2]
    video_ids = params[4]
    upload_annotations = bool(params[3])
    version = params[6]
    create_collection = params[7]
    return model_name, concepts, video_ids, upload_annotations, version, create_collection

def predict():
    user_model = model_name + "-" + version
    download_weights(user_model)
    setup_predict_progress(video_ids)
    model_id = get_model_id(upload_annotations, model_name, version)
    print(f'model id: {model_id}') # debug
    evaluate_videos(concepts, video_ids, user_model, upload_annotations, model_id)
    if create_collection:
        create_collection(model_id)
    cleanup()

def get_model_id(upload_annotations, model_name, version):
    if upload_annotations:
        cursor.execute(
            f'''
            SELECT modelid FROM model_versions WHERE 
            model='{model_name}' AND version='{version}'
            '''
        )
        cursor.commit()
        return int(cursor.fetchone()[0])
    else: # don't need model id
        return None

def create_collection(model_id, video_ids):
    cursor.execute(
        f'''
        SELECT id FROM annotations WHERE userid={model_id}
        AND videoid in {video_ids}
        '''
    )
    cursor.commit()
    annotation_ids = cursor.fetchall()
    cursor.execute(
        f'''
        INSERT INTO annotation_collection 
        (name, description, users, videos, concepts, tracking, conceptid)
        '''
    )
    # finish this

def download_weights(user_model):
    filename = user_model + '.h5'
    try:
        s3.download_file(
            S3_BUCKET,
            S3_WEIGHTS_FOLDER + filename,
            WEIGHTS_PATH
        )
        print("downloaded file: {0}".format(filename))
    except ClientError:
        print("Could not find weights file {0} in S3, exiting".format(filename))
        cleanup()


def cleanup():
    end_predictions()
    shutdown_server()


if __name__ == '__main__':
    main()
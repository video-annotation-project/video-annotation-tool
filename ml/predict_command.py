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
    (model_name, concept_ids, video_ids, upload_annotations, version, 
    create_collection) = get_predict_params()
    predict(model_name, concept_ids, video_ids, upload_annotations, version)
    cleanup()

def get_predict_params():
    '''
    get predict params
    model - string: name of the model
    concept_ids - int[]: list of concept ids model is trying to find
    video_ids - int[]: list of video ids model is trying to predict on
    upload_annotations - boolean: if true upload annotations to database
    version - string: model version
    create_collection - boolean: if true create annotation collection
    '''
    cursor.execute("SELECT * FROM predict_params")
    params = cursor.fetchone()
    model_name = str(params[0])
    concept_ids = params[2]
    video_ids = params[4]
    upload_annotations = bool(params[3])
    version = params[6]
    create_collection = params[7]
    return model_name, concept_ids, video_ids, upload_annotations, version, create_collection

def predict(model_name, concept_ids, video_ids, upload_annotations, version):
    user_model = model_name + "-" + version
    download_weights(user_model)
    setup_predict_progress(video_ids)
    evaluate_videos(concept_ids, video_ids, user_model, upload_annotations)
    if create_collection:
        model_id = get_model_id(model_name, version)
        create_collection(user_model, model_id, video_ids, concept_ids)
        add_to_collection(collection_id)

def create_collection(user_model, video_ids, concept_ids):
    concept_names = get_concept_names(concept_ids)
    cursor.execute(
        f'''
        INSERT INTO annotation_collection (
            name, 
            users, 
            videos, 
            concepts, 
            tracking, 
            conceptid
        )
        VALUES (
            '{user_model} on {video_ids}', 
            '{user_model}', 
            '{video_ids}', 
            '{concept_names}', 
            false,
            '{concept_ids}'
        )
        RETURNING id
        '''
    )
    cursor.commit()
    collection_id = cursor.fetchone()[0]
    return collection_id

def add_to_collection(model_id, video_ids, collection_id):
    cursor.execute(
        f'''
        WITH annotation_ids AS (
            SELECT id 
            FROM annotations
            WHERE userid={model_id}
            AND videoid in {video_ids}
        )
        INSERT INTO 
            annotation_intermediate (id, annotationid)
        (
            '{collection_id}', annotation_ids
        )
        '''
    )
    cursor.commit()
    # need to test this

def get_annotation_ids(model_id, video_ids):
    cursor.execute(
        f'''
        SELECT id FROM annotations WHERE userid={model_id}
        AND videoid in {video_ids}
        '''
    )
    cursor.commit()
    annotation_ids = cursor.fetchall()
    return annotation_ids

def get_concept_names(concept_ids):
    cursor.execute(
        f'''
        SELECT name FROM concepts WHERE id in {concept_ids}
        '''
    )
    cursor.commit()
    concept_names = cursor.fetchall()
    return concept_names

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

def get_model_id(model_name, version) {
    cursor.execute(
        f'''
        SELECT userid FROM model_versions WHERE 
        model='{model_name}' 
        AND version='{version}'
        '''
    )
    cursor.commit()
    model_id = cursor.fetchone()[0]
    return model_id
}


def cleanup():
    end_predictions()
    shutdown_server()


if __name__ == '__main__':
    main()
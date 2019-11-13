from psycopg2 import connect
import subprocess
from dotenv import load_dotenv
import boto3
import json
from utils.query import s3, con, cursor, pd_query
from config.config import S3_BUCKET, S3_WEIGHTS_FOLDER, WEIGHTS_PATH
from train_command import setup_predict_progress, evaluate_videos, end_predictions, shutdown_server
from botocore.exceptions import ClientError


def main():
    predict()
    cleanup()

def predict():
    params = get_predict_params()
    user_model = params["model"] + "-" + str(params["version"])
    if params["create_collection"]:
        model_userid = get_model_userid(params)
        print(f"model userid: {model_userid}")
        collection_id = insert_collection(user_model, params)
        #add_to_collection(model_userid, video_ids, collection_id)

def get_predict_params():
    '''
    model - string: name of the model
    concept_ids - int[]: list of concept ids model is trying to find
    upload_annotations - boolean: if true upload annotations to database
    video_ids - int[]: list of video ids model is trying to predict on
    version - string: model version
    create_collection - boolean: if true create annotation collection
    '''
    predict_params = pd_query(
        "SELECT * FROM predict_params"
    ).iloc[0]
    return predict_params

def get_model_userid(params):
    cursor.execute(
        """
        SELECT userid FROM model_versions WHERE 
        model=%s 
        AND version=%s
        """,
        (
         params["model"],
         params["version"]
        )
    )
    con.commit()
    model_userid = cursor.fetchone()[0]
    return model_userid

def insert_collection(user_model, params):
    concept_names = get_concept_names(params)
    collection_name = "{0} on {1}".format(user_model, params["videos"])
    user_model = "{" + user_model + "}"
    cursor.execute(
        """
        INSERT INTO annotation_collection (
            name, 
            users, 
            videos, 
            concepts, 
            tracking, 
            conceptid
        )
        VALUES (%s, %s, %s, %s, false, %s)
        RETURNING id
        """,
        (
            collection_name,
            user_model,
            params["videos"],
            concept_names,
            params["concepts"]
        )
    )
    con.commit()
    collection_id = cursor.fetchone()[0]
    print(f"collection id: {collection_id}")
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
            {collection_id}, annotation_ids
        )
        '''
    )
    con.commit()

def get_annotation_ids(model_id, video_ids):
    cursor.execute(
        f'''
        SELECT id FROM annotations WHERE userid={model_id}
        AND videoid in {video_ids}
        '''
    )
    con.commit()
    annotation_ids = cursor.fetchall()
    return annotation_ids

def get_concept_names(params):
    concept_ids = tuple(params["concepts"])
    cursor.execute(
        """
        SELECT name FROM concepts WHERE id in %s
        """,
        (concept_ids, )
    )
    con.commit()
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

def cleanup():
    end_predictions()
    shutdown_server()


if __name__ == '__main__':
    main()
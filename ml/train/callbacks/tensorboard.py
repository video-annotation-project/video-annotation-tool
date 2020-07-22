import os
import datetime

import tensorflow.keras as keras
import boto3
from psycopg2 import connect

from config import config


class TensorboardLog(keras.callbacks.Callback):

    def __init__(
            self, model_name, min_examples, epochs, collection_ids, job_id):

        self.table_name = 'model_versions'
        self.model_name = model_name
        self.job_id = job_id

        self.connection = connect(
            database=config.DB_NAME,
            host=config.DB_HOST,
            user=config.DB_USER,
            password=config.DB_PASSWORD
        )

        self.cursor = self.connection.cursor()

        self.client = boto3.client(
            's3',
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY
        )

    def on_train_begin(self, logs={}):
        self.cursor.execute(
            f"""UPDATE
                {self.table_name}
            SET
                start_train=%s
            WHERE
                model=%s""",
            (datetime.datetime.now(), '-'.join(self.model_name.split('-')[:-1])))

        self.connection.commit()

    def on_train_end(self, logs={}):
        self.cursor.execute(
            f"""UPDATE
                {self.table_name}
            SET
                end_train=%s
            WHERE
                model=%s""",
            (datetime.datetime.now(), '-'.join(self.model_name.split('-')[:-1])))

        self.connection.commit()

    def on_epoch_begin(self, epoch, logs={}):
        return

    def on_epoch_end(self, epoch, logs={}):
        path = f'./logs/{self.job_id}'

        for root, dirs, files in os.walk(path):
            for file in files:
                self.client.upload_file(
                    os.path.join(root, file),
                    config.S3_BUCKET, f'{config.S3_LOGS_FOLDER}{self.model_name}/{file}'
                )

    def on_batch_begin(self, batch, logs={}):
        return

    def on_batch_end(self, batch, logs={}):
        return

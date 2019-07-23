import os
import json
import datetime

import keras
import boto3
from psycopg2 import connect
from dotenv import load_dotenv


class Progress(keras.callbacks.Callback):

    def __init__(self, steps_per_epoch, num_epochs):

        self.steps_per_epoch = steps_per_epoch
        self.max_epoch = num_epochs
        self.curr_epoch = 0

        self.table_name = 'training_progress'

        config_path = "../config.json"
        load_dotenv(dotenv_path="../.env")

        with open(config_path) as config_buffer:    
            config = json.loads(config_buffer.read())['ml']

        # Connect to database
        DB_NAME = os.getenv("DB_NAME")
        DB_HOST = os.getenv("DB_HOST")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")

        self.connection = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
        self.cursor = self.connection.cursor()


    def on_train_begin(self, logs={}):
        self.cursor.execute(
            f"""INSERT INTO {self.table_name} 
                    (running, curr_epoch, max_epoch, curr_batch, steps_per_epoch) 
                VALUES 
                    (TRUE, 0, %s, 0, %s) RETURNING id""",
            (self.max_epoch, self.steps_per_epoch))

        self.run_id = self.cursor.fetchone()[0]
        self.connection.commit()

    
    def on_train_end(self, logs={}):
        self.cursor.execute(f"""UPDATE {self.table_name} SET running = FALSE WHERE id = %s""", (self.run_id,))
        self.connection.commit()

 
    def on_epoch_begin(self, epoch, logs={}):
        self.cursor.execute(f"""UPDATE {self.table_name}  SET curr_epoch = %s WHERE id = %s""", 
            (epoch, self.run_id))
        self.connection.commit()
 

    def on_epoch_end(self, epoch, logs={}):
        self.curr_epoch = epoch


    def on_batch_begin(self, batch, logs={}):
        self.curr_batch = batch

        self.cursor.execute(
            f"""UPDATE {self.table_name}
                SET 
                    curr_batch = %s
                WHERE id = %s""", 
            (batch, self.run_id))

        self.connection.commit()
 

    def on_batch_end(self, batch, logs={}):
        return


class TensorBoardLog(keras.callbacks.Callback):

    def __init__(self, model_name, min_examples, epochs, collection_ids):

        self.table_name = 'previous_runs'

        config_path = "../config.json"
        load_dotenv(dotenv_path="../.env")

        with open(config_path) as config_buffer:    
            config = json.loads(config_buffer.read())['ml']

        # Connect to database
        DB_NAME = os.getenv("DB_NAME")
        DB_HOST = os.getenv("DB_HOST")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")

        self.bucket = os.getenv('AWS_S3_BUCKET_NAME')
        self.logs_dir = os.getenv('AWS_S3_BUCKET_LOGS_FOLDER')

        self.connection = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
        self.cursor = self.connection.cursor()

        self.client = boto3.client('s3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'))

        self.id = _create_log_entry(
            model_name=model_name,
            min_examples=min_examples,
            epochs=epochs,
            collection_ids=collection_ids
        )


    def on_train_begin(self, logs={}):
        self.cursor.execute(
        f"""UPDATE 
                {self.table_name} 
            SET
                start_train=%s 
            WHERE 
                id=%s""",
        (datetime.datetime.now(), self.id))

        self.connection.commit()
    

    def on_train_end(self, logs={}):
        self.cursor.execute(
        f"""UPDATE 
                {self.table_name} 
            SET
                end_train=%s 
            WHERE 
                id=%s""",
        (datetime.datetime.now(), self.id))
        
        self.connection.commit()

 
    def on_epoch_begin(self, epoch, logs={}):
        return
 

    def on_epoch_end(self, epoch, logs={}):
        path = f'./logs/{self.id}'

        for root, dirs, files in os.walk(path):
            for file in files:
                self.client.upload_file(os.path.join(root, file), 
                    self.bucket, f'{self.logs_dir}{self.id}/{file}')


    def on_batch_begin(self, batch, logs={}):
        return
 

    def on_batch_end(self, batch, logs={}):
        return


    def _create_log_entry(model_name, min_examples, epochs, collection_ids):
        self.cursor.execute(
            f"""INSERT INTO {self.table_name} 
                    (model_name, epochs, min_examples, collection_ids) 
                VALUES 
                    (%s, %s, %s, %s) RETURNING id""",
            (model_name, epochs, min_examples, collection_ids))

        log_id = self.cursor.fetchone()[0]
        self.connection.commit()

        return log_id


# Testing
if __name__ == '__main__':
    steps_per_epoch = 100
    num_epochs = 3

    progress = Progress(steps_per_epoch=steps_per_epoch, num_epochs=num_epochs)

    progress.on_train_begin()
    for epoch in range(num_epochs):
        progress.on_epoch_begin(epoch)
        for batch in range(steps_per_epoch):
            progress.on_batch_begin(batch)
            progress.on_batch_end(batch)
        progress.on_epoch_end(epoch)
    progress.on_train_end()





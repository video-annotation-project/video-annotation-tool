import os
import json

import keras
from psycopg2 import connect
from dotenv import load_dotenv

# CREATE TABLE training_progress (
#     id serial PRIMARY KEY,
#     running bool,
#     curr_epoch integer,
#     max_epoch integer,
#     curr_batch integer
# );

class Progress(keras.callbacks.Callback):

    def __init__(self, steps_per_epoch, num_epochs):

        self.steps_per_epoch = steps_per_epoch
        self.max_epoch = num_epochs - 1
        self.last_epoch_end_batch = 0
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


# Testing
if __name__ == '__main__':
    steps_per_epoch = 10
    num_epochs = 5

    progress = Progress(steps_per_epoch=steps_per_epoch, num_epochs=num_epochs)

    progress.on_train_begin()
    for epoch in range(num_epochs + 1):
        progress.on_epoch_begin()
        for batch in range(steps_per_epoch + 1):
            progress.on_batch_begin(batch)
            progress.on_batch_end(batch)
        progress.on_epoch_end(epoch)
    progress.on_train_end()





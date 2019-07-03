import os
import json

import keras
from psycopg2 import connect
from dotenv import load_dotenv


# CREATE TABLE previous_runs (
#     id serial PRIMARY KEY,
#     start_train timestamp,
#     end_train timestamp,
#     min_examples integer,
#     epochs integer,
#     concepts text,
#     videos text,
#     users text
# );

def create_log_entry(table_name, model_name, min_examples, videos, concepts, epochs, users):

    users = "\'" +  ','.join(str(e) for e in users) + "\'"
    videos = "\'" + ','.join(str(e) for e in videos) + "\'"
    concepts = "\'" + ','.join(str(e) for e in concepts) + "\'"

    config_path = "../config.json"
    load_dotenv(dotenv_path="../.env")

    with open(config_path) as config_buffer:    
        config = json.loads(config_buffer.read())['ml']

    # Connect to database
    DB_NAME = os.getenv("DB_NAME")
    DB_HOST = os.getenv("DB_HOST")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")

    connection = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
    cursor = connection.cursor()

    cursor.execute(
        f"""INSERT INTO {table_name} 
                (model_name, epochs, min_examples, videos, concepts, users) 
            VALUES 
                (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (model_name, epochs, min_examples, videos, concepts, users))

    log_id = cursor.fetchone()[0]
    connection.commit()

    return log_id

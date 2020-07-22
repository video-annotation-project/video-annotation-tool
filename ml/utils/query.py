import pandas as pd
from psycopg2 import connect
import boto3

from config import config


con = connect(
    database=config.DB_NAME,
    user=config.DB_USER,
    password=config.DB_PASSWORD,
    host=config.DB_HOST
)
cursor = con.cursor()

s3 = boto3.client(
    's3',
    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY
)

def get_db_connection():
    return connect(
            database=config.DB_NAME,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            host=config.DB_HOST
            )

def get_s3_connection():
    return boto3.client(
            's3',
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY
            )

def pd_query(query_string, params=None, local_con=None):
    """
    Execture a SQL query using Pandas
    Returns resulting rows
    """
    connection = local_con if local_con else con
    result = pd.read_sql_query(query_string, connection, params=params)
    return result


def query(query_string, params=None, local_con=None):
    """
    Execture a SQL query
    """
    connection = local_con if local_con else con
    connection.cursor().execute(query_string, params)
    connection.commit()

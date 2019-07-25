import os

import pandas as pd
from dotenv import load_dotenv
from psycopg2 import connect

load_dotenv(dotenv_path="../.env")

DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")


def query(query, params=None):
    """
    Execture a SQL query
    Returns resulting rows
    """
    conn = connect(
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST
    )

    result = pd.read_sql_query(query, conn, params=params)
    conn.close()
    return result

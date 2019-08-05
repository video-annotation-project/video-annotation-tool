import pandas as pd
from psycopg2 import connect

import config

connection = connect(
    database=config.DB_NAME,
    user=config.DB_USER,
    password=config.DB_PASSWORD,
    host=config.DB_HOST
)


def pd_query(query_string, params=None):
    """
    Execture a SQL query using Pandas
    Returns resulting rows
    """

    result = pd.read_sql_query(query_string, connection, params=params)
    return result


def query(query_string, params=None):
    """
    Execture a SQL query
    """
    connection.cursor().execute(query_string, params)
    connection.commit()

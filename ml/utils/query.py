import pandas as pd
from psycopg2 import connect

import config


def query(query, params=None):
    """
    Execture a SQL query
    Returns resulting rows
    """
    conn = connect(
        database=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        host=config.DB_HOST
    )

    result = pd.read_sql_query(query, conn, params=params)
    conn.close()
    return result

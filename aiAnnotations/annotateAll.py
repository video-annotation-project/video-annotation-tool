from pgdb import connect
import os
from dotenv import load_dotenv
import aiAnnotate

load_dotenv(dotenv_path="../.env")

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
cursor = con.cursor()

# get annotations from Ali
cursor.execute("SELECT * FROM annotations WHERE userid=6")
rows = cursor.fetchmany(1)
con.close()

for i in rows:
	aiAnnotate.ai_annotation(i)


import sys
import time
from multiprocessing import Process

import boto3

from config import config

# This file is run as a cronjob, uploading the stdout and stderr
# Files to the S3 bucket at a set interval

STDOUT_FILE = "stdout.txt"
STDERR_FILE = "stderr.txt"

def upload_stdout_stderr():
    client = connect_s3()
    while True:
        client.upload_file(STDOUT_FILE, config.S3_BUCKET, f'{config.S3_STDOUT_FOLDER}{STDOUT_FILE}') 
        client.upload_file(STDERR_FILE, config.S3_BUCKET, f'{config.S3_STDOUT_FOLDER}{STDERR_FILE}') 
        time.sleep(5)



def connect_s3():
    client = boto3.client(
        's3',
        aws_access_key_id=config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY
    )
    return client

def start_uploading():
    process = Process(target=upload_stdout_stderr)
    process.start()
    return process
    


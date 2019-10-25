import os
import sys
import time
from multiprocessing import Process

import boto3

from config import config

# This file is run alongside the training process, 
# Uploading the stdout and stderr files to the S3 bucket at a set interval

STDOUT_FILE = "stdout.txt"
STDERR_FILE = "stderr.txt"

def upload_stdout_stderr(main_pid):
    """ Continuously upload the stdout/stderr files to the s3 bucket """
    client = _connect_s3()
    
    # While the main process is running, upload stdout/stderr every 5 seconds
    while _pid_exists(main_pid):
        client.upload_file(STDOUT_FILE, config.S3_BUCKET, f'{config.S3_STDOUT_FOLDER}{STDOUT_FILE}')
        client.upload_file(STDERR_FILE, config.S3_BUCKET, f'{config.S3_STDOUT_FOLDER}{STDERR_FILE}')
        time.sleep(5)

    # One last upload before signing off
    client.upload_file(STDOUT_FILE, config.S3_BUCKET, f'{config.S3_STDOUT_FOLDER}{STDOUT_FILE}')
    client.upload_file(STDERR_FILE, config.S3_BUCKET, f'{config.S3_STDOUT_FOLDER}{STDERR_FILE}')

def start_uploading(main_pid):
    """ Start the process of uploading stdout/stderr """
    process = Process(target=upload_stdout_stderr, args=(main_pid,))
    process.start()
    return process

def _connect_s3():
    """ Connect to the s3 server """
    client = boto3.client(
        's3',
        aws_access_key_id=config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY
    )
    return client

def _pid_exists(pid):        
    """ Check For the existence of a unix pid. """
    # Signal 0 simply checks if a process is running
    # Despite "kill", the process will not terminate
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    else:
        return True
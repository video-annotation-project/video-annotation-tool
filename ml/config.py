import os
import json

from dotenv import load_dotenv

# This file loads in all environmental and configuration variables

config_path = "../config.json"
load_dotenv(dotenv_path="../.env")

config_file = open(config_path)
config = json.load(config_file)['ml']
config_file.close()

# Model weights paths
WEIGHTS_PATH = config['weights_path']
DEFAULT_WEIGHTS_PATH = config['default_weights']

# Other folders
IMAGE_FOLDER = config['image_folder']
TEST_EXAMPLES = config['test_examples']

# Batch size to train with
BATCH_SIZE = config['batch_size']

# AWS keys
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# S3 variables
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
S3_ANNOTATION_FOLDER = os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER")
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')
S3_TRACKING_FOLDER = os.getenv("AWS_S3_BUCKET_TRACKING_FOLDER")
S3_WEIGHTS_FOLDER = os.getenv("AWS_S3_BUCKET_WEIGHTS_FOLDER")

# Database variables
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

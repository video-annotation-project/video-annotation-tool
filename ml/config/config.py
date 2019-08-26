import os
import json

from dotenv import load_dotenv

# This file loads in all environmental and configuration variables

config_path = "../config.json"
load_dotenv(dotenv_path="../.env")
print(os.environ)

config_file = open(config_path)
config = json.load(config_file)["ml"]
config_file.close()

# Evaluation validation
GOOD_USERS = config["biologist_users"]
EVALUATION_IOU_THRESH = config["evaluation_iou_threshold"]
RESIZED_WIDTH = config["resized_video_width"]
RESIZED_HEIGHT = config["resized_video_height"]
NUM_FRAMES = config["frames_between_predictions"]
THRESHOLDS = config["prediction_confidence_thresholds"]
TRACKING_IOU_THRESH = config["prediction_tracking_iou_threshold"]
MIN_FRAMES_THRESH = config["min_frames_threshold"]
MAX_TIME_BACK = config["max_seconds_back"]

# Tracking
LENGTH = config['tracking_vid_length']  # length of video in milliseconds

# Model weights paths
WEIGHTS_PATH = config["weights_path"]
DEFAULT_WEIGHTS_PATH = config["default_weights"]

# Other folders
IMAGE_FOLDER = config["image_folder"]
TEST_EXAMPLES = config["test_examples"]

# Batch size to train with
BATCH_SIZE = config["batch_size"]

# AWS keys
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# S3 variables
S3_BUCKET = os.getenv("AWS_S3_BUCKET_NAME")
S3_ANNOTATION_FOLDER = os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER")
S3_VIDEO_FOLDER = os.getenv("AWS_S3_BUCKET_VIDEOS_FOLDER")
S3_TRACKING_FOLDER = os.getenv("AWS_S3_BUCKET_TRACKING_FOLDER")
S3_WEIGHTS_FOLDER = os.getenv("AWS_S3_BUCKET_WEIGHTS_FOLDER")
S3_METRICS_FOLDER = os.getenv("AWS_S3_BUCKET_METRICS_FOLDER")
S3_BUCKET_AIVIDEOS_FOLDER = os.getenv("AWS_S3_BUCKET_AIVIDEOS_FOLDER")
S3_LOGS_FOLDER = os.getenv("AWS_S3_BUCKET_LOGS_FOLDER")

# Database variables
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

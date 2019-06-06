from dotenv import load_dotenv
from keras_retinanet.models import convert_model
from keras_retinanet.models import load_model
import cv2
import json
import numpy as np
import argparse
import copy
import os
import boto3
import keras
import pandas as pd
import uuid
import boto3
from psycopg2 import connect
from loading_data import queryDB
import psycopg2
import datetime

# Load environment variables
load_dotenv(dotenv_path="../.env")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id = AWS_ACCESS_KEY_ID, aws_secret_access_key = AWS_SECRET_ACCESS_KEY)
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')
S3_ANNOTATION_FOLDER = os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER")
S3_TRACKING_FOLDER = os.getenv("AWS_S3_BUCKET_TRACKING_FOLDER")

# Connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

argparser = argparse.ArgumentParser()
argparser.add_argument(
   '-c',
   '--conf',
   default='config.json',
   help='path to configuration file')

args = argparser.parse_args()
config_path = args.conf

with open(config_path) as config_buffer:
    config = json.loads(config_buffer.read())

NUM_FRAMES = config['frames_between_predictions']
THRESHOLDS = config['prediction_confidence_thresholds']
TRACKING_IOU_THRESH = config['prediction_tracking_iou_threshold']
MIN_FRAMES_THRESH = config['min_frames_threshold']
VIDEO_WIDTH = config['resized_video_width']
VIDEO_HEIGHT = config['resized_video_height']
MAX_TIME_BACK = config['max_seconds_back']

class Tracked_object:

    def __init__(self, detection, frame, frame_num):
        self.annotations = pd.DataFrame(columns=['x1','y1','x2','y2','label', 'confidence', 'objectid','frame_num'])
        (x1, y1, x2, y2) = detection[0]
        self.id = uuid.uuid4()
        self.x1 = x1
        self.x2 = x2
        self.y1 = y1
        self.y2 = y2
        self.box = (x1, y1, (x2-x1), (y2-y1))
        self.tracker = cv2.TrackerKCF_create()
        self.tracker.init(frame, self.box)
        label = detection[2]
        confidence = detection[1]
        self.save_annotation(frame_num,label=label, confidence=confidence)

    def save_annotation(self, frame_num, label=None, confidence=None):
        annotation = {}
        annotation['x1'] = self.x1
        annotation['y1'] = self.y1
        annotation['x2'] = self.x2
        annotation['y2'] = self.y2
        annotation['label'] = label
        annotation['confidence'] = confidence
        annotation['objectid'] = self.id
        annotation['frame_num'] = frame_num
        self.annotations = self.annotations.append(annotation, ignore_index=True)

    def reinit(self, detection, frame, frame_num):
        (x1, y1, x2, y2) = detection[0]
        self.x1 = x1
        self.x2 = x2
        self.y1 = y1
        self.y2 = y2
        self.box = (x1, y1, (x2-x1), (y2-y1))
        self.tracker = cv2.TrackerKCF_create()
        self.tracker.init(frame, self.box) 
        label = detection[2]
        confidence = detection[1]
        self.annotations = self.annotations[:-1]
        self.save_annotation(frame_num, label=label, confidence=confidence)

    def update(self, frame, frame_num):
        success, box = self.tracker.update(frame)
        (x1, y1, w, h) = [int(v) for v in box]
        if success:
            self.x1 = x1
            self.x2 = x1 + w
            self.y1 = y1
            self.y2 = y1 + h 
            self.box = (x1, y1, w, h)
            self.save_annotation(frame_num)
        return success

    def change_id(self, matched_obj_id):
        self.id = matched_obj_id
        self.annotations['objectid'] = matched_obj_id


def predict_on_video(videoid, model_weights, concepts, upload_annotations=False, userid=None):
    video_name = queryDB("select * from videos where id = " + str(videoid)).iloc[0].filename
    print("Loading Video")
    frames, fps = get_video_frames(video_name)
    original_frames = copy.deepcopy(frames)
    print("Initializing Model")
    model = init_model(model_weights)
    print("Predicting")
    results, frames = predict_frames(frames, fps, model)
    results = propagate_conceptids(results, concepts)
    results = length_limit_objects(results, MIN_FRAMES_THRESH)
    generate_video('output.mp4', copy.deepcopy(original_frames), fps, results)
    if upload_annotations:
        con = psycopg2.connect(database = DB_NAME,
                        user = DB_USER,
                        password = DB_PASSWORD,
                        host = DB_HOST,
                        port = "5432")
        cursor = con.cursor()
        # filter results down to middle frames
        final = get_final_predictions(results)
        # upload these annotations
        final.apply(lambda x: handle_annotation(cursor, x, original_frames, videoid, VIDEO_HEIGHT, VIDEO_WIDTH, userid, fps), axis=1)
        con.commit()
        con.close()
    return results, fps

def get_video_frames(video_name):
    frames = []
    # grab video stream
    url = s3.generate_presigned_url('get_object',
            Params = {'Bucket': S3_BUCKET,
                      'Key': S3_VIDEO_FOLDER + video_name},
                       ExpiresIn = 100)
    vid = cv2.VideoCapture(url)
    fps = vid.get(cv2.CAP_PROP_FPS)
    while not vid.isOpened():
        continue
    print("Successfully opened video.")
    check = True
    while True:
        check, frame = vid.read()
        if not check:
            break
        frame = cv2.resize(frame, (VIDEO_WIDTH, VIDEO_HEIGHT))
        frames.append(frame)
    vid.release()
    return frames,fps

def init_model(model_path):
    model = load_model(model_path, backbone_name='resnet50')
    model = convert_model(model)
    return model

def predict_frames(video_frames, fps, model):
    currently_tracked_objects = []
    annotations = [pd.DataFrame(columns=['x1','y1','x2','y2','label', 'confidence', 'objectid','frame_num'])]
    for i, frame in enumerate(video_frames):
        frame_num = i
        # update tracking for currently tracked objects
        for obj in currently_tracked_objects:
            success = obj.update(frame, frame_num)
            if not success:
                annotations.append(obj.annotations)
                currently_tracked_objects.remove(obj)
                # Check if there is a matching prediction if the tracking fails?

        # Every NUM_FRAMES frames, get new predictions
        # Then, check if any detections match a currently tracked object
        if i % NUM_FRAMES == 0:
            detections = get_predictions(frame, model)
            for detection in detections:
                match, matched_object = does_match_existing_tracked_object(detection, currently_tracked_objects)
                if match:
                    matched_object.reinit(detection, frame, frame_num)
                else:
                    tracked_object = Tracked_object(detection, frame, frame_num)
                    prev_annotations, matched_obj_id = track_backwards(video_frames, frame_num, detection, tracked_object.id, fps, pd.concat(annotations))
                    if matched_obj_id:
                        tracked_object.change_id(matched_obj_id)
                    tracked_object.annotations = tracked_object.annotations.append(prev_annotations)
                    currently_tracked_objects.append(tracked_object)
                    (x, y, w, h) = obj.box
                    cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0, 0), 3)
                    
         # draw boxes 
        for obj in currently_tracked_objects:
            (x, y, w, h) = obj.box
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
    
    for obj in currently_tracked_objects:
        annotations.append(obj.annotations)
                
    results = pd.concat(annotations)
    results.to_csv('results.csv')
    return results, video_frames

def get_predictions(frame, model):
    frame = np.expand_dims(frame, axis=0)
    boxes, scores, labels = model.predict_on_batch(frame)
    predictions = zip (boxes[0],scores[0],labels[0])
    filtered_predictions = []
    for box, score,label in predictions:
        if THRESHOLDS[label] > score:
            continue
        filtered_predictions.append((box,score,label))
    return filtered_predictions

def does_match_existing_tracked_object(detection, currently_tracked_objects):
    (x1, y1, x2, y2) = detection[0]
    detection = pd.Series({'x1' : x1, 'y1' : y1, 'x2' : x2, 'y2' : y2})
    # Compute IOU with each currently tracked object
    max_iou = 0 
    match = None
    for obj in currently_tracked_objects:
        iou = compute_IOU(obj, detection)
        if (iou > max_iou):
            max_iou = iou
            match = obj
    return (max_iou >= TRACKING_IOU_THRESH), match

def compute_IOU(A, B):
    # +1 in computations are to account for pixel indexing
    area_A = (A.x2 - A.x1) * (A.y2 - A.y1) + 1
    area_B = (B.x2 - B.x1) * (B.y2 - B.y1) + 1
    intersect_width = min(A.x2, B.x2) - max(A.x1, B.x1) + 1
    intersect_height = min(A.y2, B.y2) - max(A.y1, B.y1) + 1
    # check for zero overlap
    intersect_width = max(0, intersect_width)
    intersect_height = max(0, intersect_height)
    intersection = intersect_width * intersect_height
    return intersection / (area_A + area_B - intersection)

# get tracking annotations before first model prediction for object - max_time_back seconds
# skipping original frame annotation, already saved in object initialization
def track_backwards(video_frames, frame_num, detection, object_id, fps, old_annotations):
    annotations = pd.DataFrame(columns=['x1','y1','x2','y2','label', 'confidence', 'objectid','frame_num'])
    (x1, y1, x2, y2) = detection[0]
    box = (x1, y1, (x2-x1), (y2-y1))
    frame = video_frames[frame_num]
    tracker = cv2.TrackerKCF_create()
    tracker.init(frame, box)
    success, box = tracker.update(frame)
    frames = 0
    max_frames = fps * MAX_TIME_BACK
    while success and frames < max_frames and frame_num > 0:
        frame_num -= 1
        frame = video_frames[frame_num]
        success, box = tracker.update(frame)
        if success:
            annotation = make_annotation(box, object_id, frame_num)
            last_frame_annotations = old_annotations[old_annotations['frame_num'] == frame_num]
            matched_obj_id = match_old_annotations(last_frame_annotations, pd.Series(annotation))
            if matched_obj_id:
                annotations['objectid'] = matched_obj_id
                return annotations, matched_obj_id

            annotations = annotations.append(annotation, ignore_index=True)
            frames += 1
    return annotations, None

def match_old_annotations(old_annotations, annotation):
    max_iou = 0 
    match = None
    for _, annot in old_annotations.iterrows():
        iou = compute_IOU(annot, annotation)
        if (iou > max_iou):
            max_iou = iou
            match = annot['objectid']
    return match if (max_iou >= TRACKING_IOU_THRESH) else None

def make_annotation(box, object_id, frame_num):
    (x1, y1, w, h) = [int(v) for v in box]
    x1 = x1
    x2 = x1 + w
    y1 = y1
    y2 = y1 + h
    annotation = {}
    annotation['x1'] = x1
    annotation['y1'] = y1
    annotation['x2'] = x2
    annotation['y2'] = y2
    annotation['label'] = None
    annotation['confidence'] = None
    annotation['objectid'] = object_id
    annotation['frame_num'] = frame_num
    return annotation

# Given a list of annotations(some with or without labels/confidence scores) for multiple objects choose a label for each object
def propagate_conceptids(annotations, concepts):
    label = None
    objects = annotations.groupby(['objectid'])
    for oid, group in objects:
        scores = {}
        for k , label in group.groupby(['label']):
            scores[k] = label.confidence.mean() # Maybe the sum?
        idmax = max(scores.keys(), key=(lambda k: scores[k]))
        annotations.loc[annotations.objectid == oid,'label'] = idmax
    annotations['label'] = annotations['label'].apply(lambda x: concepts[int(x)])
    annotations['conceptid'] = annotations['label'] # need both label and conceptid for later
    return annotations

# Limit results based on tracked object length (ex. > 30 frames)
def length_limit_objects(pred, frame_thresh):
    obj_len = pred.groupby('objectid').conceptid.value_counts()
    len_thresh = obj_len[obj_len > frame_thresh]
    return pred[[(obj in len_thresh) for obj in pred.objectid]] 

# Generates the video with the ground truth frames interlaced
def generate_video(filename, frames, fps, results):
    for res in results.itertuples():
        x1, y1, x2, y2 = int(res.x1), int(res.y1), int(res.x2), int(res.y2)
        cv2.rectangle(frames[res.frame_num], (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frames[res.frame_num], str(res.conceptid), (x1, y1+15), 
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    save_video(filename, frames, fps)

def save_video(filename, frames, fps):
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, fps, frames[0].shape[::-1][1:3])
    for frame in frames:
        out.write(frame)
    out.release()
    cv2.destroyAllWindows()

# Chooses single prediction for each object (the middle frame)
def get_final_predictions(results):
    middle_frames = []
    for obj in [df for _, df in results.groupby('objectid')]:
        middle_frame = int(obj.frame_num.median())
        frame = obj[obj.frame_num == middle_frame]
        # Skip erroneous frames without data
        if frame.shape == (0, 10):
            continue
        middle_frames.append(frame.values.tolist()[0])
    middle_frames = pd.DataFrame(middle_frames)
    middle_frames.columns = results.columns
    return middle_frames

def handle_annotation(cursor, x, frames, videoid, videoheight, videowidth, userid, fps):
    frame = frames[int(x.frame_num)]
    frame_w_box = get_boxed_image(x.x1, x.x2, x.y1, x.y2, copy.deepcopy(frame))
    upload_annotation(cursor, frame, frame_w_box, x.x1, x.x2, x.y1, x.y2, x.frame_num, x.conceptid, videoid, videowidth, videoheight, userid, fps)

def get_boxed_image(x1, x2, y1, y2, frame):
    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
    return frame

#Uploads images and puts annotation in database
def upload_annotation(cursor, frame, frame_w_box, x1, x2, y1, y2, frame_num, conceptid, videoid, videowidth, videoheight, userid, fps):
    timeinvideo = frame_num / fps
    no_box = str(videoid) + "_" + str(timeinvideo) + "_ai.png"
    box = str(uuid.uuid4()) + "_" + str(videoid) +  "_" + str(timeinvideo) + "_box_ai.png"
    temp_file = str(uuid.uuid4()) + ".png"
    cv2.imwrite(temp_file, frame)
    s3.upload_file(temp_file, S3_BUCKET, S3_ANNOTATION_FOLDER + no_box, ExtraArgs={'ContentType':'image/png'}) 
    os.system('rm '+ temp_file)
    cv2.imwrite(temp_file, frame_w_box)
    s3.upload_file(temp_file, S3_BUCKET, S3_ANNOTATION_FOLDER + box,  ExtraArgs={'ContentType':'image/png'})
    os.system('rm '+ temp_file)
    cursor.execute(
        """
       INSERT INTO annotations (
       videoid, userid, conceptid, timeinvideo, x1, y1, x2, y2, 
       videowidth, videoheight, dateannotated, image, imagewithbox) 
       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
        int(videoid), int(userid), int(conceptid), timeinvideo, x1, y1, 
        x2, y2, videowidth, videoheight, datetime.datetime.now().date(), no_box, box
        )
    ) 

if __name__ == '__main__':
    # connect to db
    con = connect(database=os.getenv("DB_NAME"), 
        host=os.getenv("DB_HOST"), 
        user=os.getenv("DB_USER"), 
        password=os.getenv("DB_PASSWORD"))
    cursor = con.cursor()

    model_name = 'test'

    s3.download_file(S3_BUCKET, S3_WEIGHTS_FOLDER + model_name + '.h5', 'current_weights.h5')
    cursor.execute("SELECT * FROM MODELS WHERE name='" + model_name + "'")
    model = cursor.fetchone()

    videoid = 86 
    concepts = model[2]

    predict_on_video(videoid, 'current_weights', concepts)

import copy
import os
import subprocess
import json

import cv2
import numpy as np
import boto3
import pandas as pd
import uuid
import psycopg2
import datetime
from dotenv import load_dotenv
from keras_retinanet.models import convert_model
from keras_retinanet.models import load_model
from psycopg2 import connect

from preprocessing.annotation_generator import get_classmap

import config
from utils.query import s3, cursor, pd_query, con


def printing_with_time(text):
    print(text + " " + str(datetime.datetime.now()))


class Tracked_object(object):

    def __init__(self, detection, frame, frame_num):
        self.annotations = pd.DataFrame(
            columns=[
                'x1', 'y1', 'x2', 'y2',
                'label', 'confidence', 'objectid', 'frame_num'
            ]
        )
        (x1, y1, x2, y2) = detection[0]
        self.id = uuid.uuid4()
        self.x1 = x1
        self.x2 = x2
        self.y1 = y1
        self.y2 = y2
        self.box = (x1, y1, (x2 - x1), (y2 - y1))
        self.tracker = cv2.TrackerKCF_create()
        print(f'{frame}        { self.box}')
        self.tracker.init(frame, self.box)
        label = detection[2]
        confidence = detection[1]
        self.save_annotation(frame_num, label=label, confidence=confidence)

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
        self.annotations = self.annotations.append(
            annotation, ignore_index=True)

    def reinit(self, detection, frame, frame_num):
        (x1, y1, x2, y2) = detection[0]
        self.x1 = x1
        self.x2 = x2
        self.y1 = y1
        self.y2 = y2
        self.box = (x1, y1, (x2 - x1), (y2 - y1))
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


def resize(row):
    new_width = config.RESIZED_WIDTH
    new_height = config.RESIZED_HEIGHT
    row.x1 = (row.x1 * new_width) / row.videowidth
    row.x2 = (row.x2 * new_width) / row.videowidth
    row.y1 = (row.y1 * new_height) / row.videoheight
    row.y2 = (row.y2 * new_height) / row.videoheight
    row.videowidth = new_width
    row.videoheight = new_height
    return row


def predict_on_video(videoid, model_weights, concepts, filename,
                     upload_annotations=False, userid=None):

    vid_filename = pd_query(f'''
            SELECT *
            FROM videos
            WHERE id ={videoid}''').iloc[0].filename
    print("Loading Video.")
    frames, fps = get_video_frames(vid_filename, videoid)
    original_frames = copy.deepcopy(frames)

    # Get biologist annotations for video

    printing_with_time("Before database query")

    annotations = pd_query(
        f'''
        SELECT
          x1, y1, x2, y2,
          conceptid as label,
          null as confidence,
          null as objectid,
          videowidth, videoheight,
          ROUND(timeinvideo*{fps}) as frame_num
        FROM
          annotations
        WHERE
          unsure=FALSE AND
          videoid={videoid} AND
          userid in {str(tuple(config.GOOD_USERS))} AND
          conceptid in {str(tuple(concepts))}''')

    printing_with_time("After database query")

    printing_with_time("Resizing annotations.")
    annotations = annotations.apply(resize, axis=1)
    annotations = annotations.drop(['videowidth', 'videoheight'], axis=1)
    printing_with_time("Done resizing annotations.")

    print("Initializing Model")
    model = init_model(model_weights)

    printing_with_time("Predicting")
    results, frames = predict_frames(frames, fps, model, videoid)
    results = propagate_conceptids(results, concepts)
    results = length_limit_objects(results, config.MIN_FRAMES_THRESH)
    # interweb human annotations and predictions
    printing_with_time("Generating Video")

    generate_video(
        filename, copy.deepcopy(original_frames),
        fps, results, concepts, videoid, annotations)
    if upload_annotations:
        # filter results down to middle frames
        mid_frame_results = get_final_predictions(results)
        # upload these annotations
        mid_frame_results.apply(
            lambda prediction: handle_annotation(prediction, original_frames, videoid,
                                                 config.RESIZED_HEIGHT, config.RESIZED_WIDTH, userid, fps), axis=1)
        con.commit()
    print("Done generating")
    return results, fps, original_frames, annotations


def get_video_frames(vid_filename, videoid):
    frames = []
    # grab video stream
    url = s3.generate_presigned_url('get_object',
                                    Params={'Bucket': config.S3_BUCKET,
                                            'Key': config.S3_VIDEO_FOLDER + vid_filename},
                                    ExpiresIn=100)
    vid = cv2.VideoCapture(url)
    fps = vid.get(cv2.CAP_PROP_FPS)
    length = int(vid.get(cv2.CAP_PROP_FRAME_COUNT))
    while not vid.isOpened():
        continue
    print("Successfully opened video.")
    check = True
    frame_counter = 0
    one_percent_length = int(length / 100)
    while True:
        if frame_counter % one_percent_length == 0:
            upload_predict_progress(frame_counter, videoid, length, 0)

        check, frame = vid.read()
        if not check:
            break
        frame = cv2.resize(
            frame, (config.RESIZED_WIDTH, config.RESIZED_HEIGHT))
        frames.append(frame)
        frame_counter += 1
    vid.release()
    print("Done resizing video.")
    return frames, fps


def init_model(model_path):
    model = load_model(model_path, backbone_name='resnet50')
    model = convert_model(model)
    return model


def predict_frames(video_frames, fps, model, videoid):
    currently_tracked_objects = []
    annotations = [
        pd.DataFrame(
            columns=[
                'x1', 'y1', 'x2', 'y2',
                'label', 'confidence', 'objectid', 'frame_num']
        )]
    total_frames = len(video_frames)
    one_percent_length = int(total_frames / 100)
    for frame_num, frame in enumerate(video_frames):
        if frame_num % one_percent_length == 0:
            # update the progress every 1% of the video
            upload_predict_progress(frame_num, videoid, total_frames, 1)

        # update tracking for currently tracked objects
        for obj in currently_tracked_objects:
            success = obj.update(frame, frame_num)
            if not success:
                annotations.append(obj.annotations)
                currently_tracked_objects.remove(obj)
                # Check if there is a matching prediction if the tracking fails?

        # Every NUM_FRAMES frames, get new predictions
        # Then, check if any detections match a currently tracked object
        if frame_num % config.NUM_FRAMES == 0:
            detections = get_predictions(frame, model)
            for detection in detections:
                match, matched_object = does_match_existing_tracked_object(
                    detection, currently_tracked_objects)
                if match:
                    matched_object.reinit(detection, frame, frame_num)
                else:
                    tracked_object = Tracked_object(
                        detection, frame, frame_num)
                    prev_annotations, matched_obj_id = track_backwards(
                        video_frames, frame_num, detection, tracked_object.id, fps, pd.concat(annotations))
                    if matched_obj_id:
                        tracked_object.change_id(matched_obj_id)
                    tracked_object.annotations = tracked_object.annotations.append(
                        prev_annotations)
                    currently_tracked_objects.append(tracked_object)

    for obj in currently_tracked_objects:
        annotations.append(obj.annotations)

    results = pd.concat(annotations)
    results.to_csv('results.csv')
    return results, video_frames


def get_predictions(frame, model):
    frame = np.expand_dims(frame, axis=0)
    boxes, scores, labels = model.predict_on_batch(frame)
    predictions = zip(boxes[0], scores[0], labels[0])
    filtered_predictions = []
    for box, score, label in predictions:
        if config.THRESHOLDS[label] > score:
            continue
        filtered_predictions.append((box, score, label))
    return filtered_predictions


def does_match_existing_tracked_object(detection, currently_tracked_objects):
    (x1, y1, x2, y2) = detection[0]
    detection = pd.Series({'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2})
    # Compute IOU with each currently tracked object
    max_iou = 0
    match = None
    for obj in currently_tracked_objects:
        iou = compute_IOU(obj, detection)
        if (iou > max_iou):
            max_iou = iou
            match = obj
    return (max_iou >= config.TRACKING_IOU_THRESH), match


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
    annotations = pd.DataFrame(
        columns=['x1', 'y1', 'x2', 'y2', 'label', 'confidence', 'objectid', 'frame_num'])
    (x1, y1, x2, y2) = detection[0]
    box = (x1, y1, (x2 - x1), (y2 - y1))
    frame = video_frames[frame_num]
    tracker = cv2.TrackerKCF_create()
    tracker.init(frame, box)
    success, box = tracker.update(frame)
    frames = 0
    max_frames = fps * config.MAX_TIME_BACK
    while success and frames < max_frames and frame_num > 0:
        frame_num -= 1
        frame = video_frames[frame_num]
        success, box = tracker.update(frame)
        if success:
            annotation = make_annotation(box, object_id, frame_num)
            prev_frame_annotations = old_annotations[old_annotations['frame_num'] == frame_num]
            matched_obj_id = match_old_annotations(
                prev_frame_annotations, pd.Series(annotation))
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
    return match if (max_iou >= config.TRACKING_IOU_THRESH) else None


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

# Given a list of annotations(some with or without labels/confidence scores)
# for multiple objects choose a label for each object


def propagate_conceptids(annotations, concepts):
    label = None
    objects = annotations.groupby(['objectid'])
    for oid, group in objects:
        scores = {}
        for k, label in group.groupby(['label']):
            scores[k] = label.confidence.mean()  # Maybe the sum?
        idmax = max(scores.keys(), key=(lambda k: scores[k]))
        annotations.loc[annotations.objectid == oid, 'label'] = idmax
        annotations.loc[annotations.objectid ==
                        oid, 'confidence'] = scores[idmax]
    annotations['label'] = annotations['label'].apply(
        lambda x: concepts[int(x)])
    # need both label and conceptid for later
    annotations['conceptid'] = annotations['label']
    return annotations

# Limit results based on tracked object length (ex. > 30 frames)


def length_limit_objects(pred, frame_thresh):
    obj_len = pred.groupby('objectid').label.value_counts()
    len_thresh = obj_len[obj_len > frame_thresh]
    return pred[[(obj in len_thresh) for obj in pred.objectid]]

# Generates the video with the ground truth frames interlaced


def generate_video(filename, frames, fps, results,
                   concepts, video_id, annotations):

    # Combine human and prediction annotations
    results = results.append(annotations)
    # Cast frame_num to int (prevent indexing errors)
    results.frame_num = results.frame_num.astype('int')
    classmap = get_classmap(concepts)

    # make a dictionary mapping conceptid to count (init 0)
    conceptsCounts = {concept: 0 for concept in concepts}
    total_length = len(results)
    one_percent_length = int(total_length / 100)
    for pred_index, res in enumerate(results.itertuples()):

        if pred_index % one_percent_length == 0:
            upload_predict_progress(pred_index, video_id, total_length, 2)

        x1, y1, x2, y2 = int(res.x1), int(res.y1), int(res.x2), int(res.y2)
        if res.confidence:
            cv2.rectangle(frames[res.frame_num], (x1, y1),
                          (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                frames[res.frame_num], str(res.confidence),
                (x1, y1 + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.putText(frames[res.frame_num], str(res.objectid), (x1, y2),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        else:
            cv2.rectangle(frames[res.frame_num], (x1, y1),
                          (x2, y2), (255, 0, 0), 2)
        cv2.putText(
            frames[res.frame_num], classmap[concepts.index(res.label)],
            (x1, y1), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    save_video(filename, frames, fps)


def save_video(filename, frames, fps):
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, fps, frames[0].shape[::-1][1:3])
    for frame in frames:
        out.write(frame)
    out.release()

    # convert to mp4 and upload to s3 and db
    # requires temp so original not overwritten
    converted_file = 'temp.mp4'
    # Convert file so we can stream on s3
    os.system(f'ffmpeg -i \'{filename}\' -codec:v libx264 -y {converted_file}')
    # upload video..
    s3.upload_file(
        converted_file, config.S3_BUCKET,
        config.S3_BUCKET_AIVIDEOS_FOLDER + filename,
        ExtraArgs={'ContentType': 'video/mp4'})
    # remove files once uploaded
    os.system('rm \'' + filename + '\'')
    os.system('rm ' + converted_file)

    # add the entry to ai_videos
    cursor.execute('''
        INSERT INTO ai_videos (name)
        VALUES (%s)''',
                   (filename,)
                   )
    con.commit()
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


def handle_annotation(prediction, frames, videoid, videoheight, videowidth, userid, fps):
    frame = frames[int(prediction.frame_num)]
    frame_w_box = get_boxed_image(
        *prediction.loc[['x1', 'x2', 'y1', 'y2']], copy.deepcopy(frame))
    upload_annotation(frame, frame_w_box,
                      *prediction.loc[['x1', 'x2', 'y1',
                                       'y2', 'frame_num', 'label']],
                      videoid, videowidth, videoheight, userid, fps)


def get_boxed_image(x1, x2, y1, y2, frame):
    cv2.rectangle(frame, (int(x1), int(y1)),
                  (int(x2), int(y2)), (0, 255, 0), 2)
    return frame

# Uploads images and puts annotation in database


def upload_annotation(frame, frame_w_box, x1, x2, y1, y2,
                      frame_num, conceptid, videoid, videowidth, videoheight, userid, fps):
    timeinvideo = frame_num / fps
    no_box = str(videoid) + "_" + str(timeinvideo) + "_ai.png"
    box = str(uuid.uuid4()) + "_" + str(videoid) + \
        "_" + str(timeinvideo) + "_box_ai.png"
    temp_file = str(uuid.uuid4()) + ".png"
    cv2.imwrite(temp_file, frame)
    s3.upload_file(temp_file, config.S3_BUCKET, config.S3_ANNOTATION_FOLDER +
                   no_box, ExtraArgs={'ContentType': 'image/png'})
    os.system('rm ' + temp_file)
    cv2.imwrite(temp_file, frame_w_box)
    s3.upload_file(temp_file, config.S3_BUCKET, config.S3_ANNOTATION_FOLDER +
                   box, ExtraArgs={'ContentType': 'image/png'})
    os.system('rm ' + temp_file)
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


# post frame_num to predict_progress psql
'''
For updating the predict_progress psql database, which tracks prediction and 
video generation status.

Arguments:
count - frame of video (or index of annotation) being processed
videoid - video being processed
con - sql connection
total_count - total number of frames in the video 
    (or number of predictions + annotations)
status - Indicates whether processing video or drawing annotation boxes
'''


def upload_predict_progress(count, videoid, total_count, status):
    '''
    For updating the predict_progress psql database, which tracks prediction and 
    video generation status.

    Arguments:
    count - frame of video (or index of annotation) being processed
    videoid - video being processed
    total_count - total number of frames in the video (or number of predictions + annotations)
    status - Indicates whether processing video or drawing annotation boxes
    '''
    print(
        f'count: {count} total_count: {total_count} vid: {videoid} status: {status}')
    if (count == 0 and status == 0):  # the starting point
        cursor.execute('''
            INSERT INTO predict_progress (videoid, framenum, totalframe, status)
            VALUES (%s, %s, %s, %s)''',
                       (videoid, count, total_count, status)
                       )
        con.commit()
        return
    elif (count == 0):
        cursor.execute('''
            UPDATE predict_progress
            SET framenum=%s, status=%s, totalframe=%s
            WHERE videoid=%s''',
                       (count, 1, total_count, videoid,))
        con.commit()
        return

    if (total_count == count):
        count = -1
    cursor.execute('''
        UPDATE predict_progress
        SET framenum=%s
        WHERE videoid=%s''',
                   (count, videoid,)
                   )
    con.commit()


if __name__ == '__main__':

    model_name = 'testV2'

    s3.download_file(config.S3_BUCKET, config.S3_WEIGHTS_FOLDER +
                     model_name + '.h5', config.WEIGHTS_PATH)
    cursor.execute("SELECT * FROM MODELS WHERE name='" + model_name + "'")
    model = cursor.fetchone()

    videoid = 86
    concepts = model[2]

    predict_on_video(videoid, config.WEIGHTS_PATH, concepts)

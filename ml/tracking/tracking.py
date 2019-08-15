import cv2
from pgdb import connect
import boto3
import os
from dotenv import load_dotenv
import datetime
import copy
import time
import uuid
import sys
import math
import json
import subprocess
from PIL import Image
import numpy as np
from itertools import zip_longest
from skimage.measure import compare_ssim

# Load environment variables
load_dotenv(dotenv_path="../.env")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY_ID,
                  aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
S3_ANNOTATION_FOLDER = os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER")
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')
S3_TRACKING_FOLDER = os.getenv("AWS_S3_BUCKET_TRACKING_FOLDER")

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

config_path = "../config.json"
with open(config_path) as config_buffer:
    config = json.loads(config_buffer.read())['ml']

# video/image properties
LENGTH = config['tracking_vid_length']  # length of video in milliseconds
IMAGES_PER_SEC = config['frames_between_predictions']
VIDEO_WIDTH = config['resized_video_width']
VIDEO_HEIGHT = config['resized_video_height']

# initialize a dictionary that maps strings to their corresponding
# OpenCV object tracker implementations
OPENCV_OBJECT_TRACKERS = {
    "csrt": cv2.TrackerCSRT_create,
    "kcf": cv2.TrackerKCF_create,
    "boosting": cv2.TrackerBoosting_create,
    "mil": cv2.TrackerMIL_create,
    "tld": cv2.TrackerTLD_create,
    "medianflow": cv2.TrackerMedianFlow_create,
    "mosse": cv2.TrackerMOSSE_create
}


def getS3Image(image):
    try:
        obj = s3.get_object(
            Bucket=S3_BUCKET,
            Key=S3_ANNOTATION_FOLDER + image
        )
    except:
        print("Annotation missing image: " + image)
        return
    # Get image in RGB and transform to BGR
    img = Image.open(obj['Body'])
    img = np.asarray(img)
    img = img[:, :, :3]
    img = img[:, :, ::-1]
    # Resize to video width/height
    img = cv2.resize(img, (VIDEO_WIDTH, VIDEO_HEIGHT))
    return img


def getTrackingUserid(cursor):
    cursor.execute("SELECT id FROM users WHERE username=%s", ("tracking",))
    return cursor.fetchone().id


def getVideoURL(cursor, videoid):
    """
    Returns
        url - video's secure streaming url
    """
    cursor.execute("SELECT filename FROM videos WHERE id=%s",
                   (str(videoid),))

    # grab video stream
    url = s3.generate_presigned_url('get_object',
                                    Params={'Bucket': S3_BUCKET,
                                            'Key': S3_VIDEO_FOLDER + cursor.fetchone().filename},
                                    ExpiresIn=100)
    return url


def getVideoFrames(url, start, end):
    """
    Returns
        fps - frames per second of video
        frame_list - frames before timeinvideo
        frame_num - start time's frame number
    """
    cap = cv2.VideoCapture(url)
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.set(0, start)  # tell video to start at 'start' time
    frame_num = (int(cap.get(1)))  # get frame number
    check = True
    frame_list = []
    curr = start

    while (check and curr <= end):
        check, frame = cap.read()
        if check:
            frame_list.append(
                cv2.resize(frame, (VIDEO_WIDTH, VIDEO_HEIGHT)))
        curr = cap.get(0)  # get time in milliseconds
    cap.release()
    return frame_list, fps, frame_num


def upload_image(frame_num, frame, frame_w_box,
                 id, videoid, conceptid, comment, unsure,
                 x1, y1, x2, y2, cursor, con, TRACKING_ID, timeinvideo):
    # Uploads images and puts annotation in database
    no_box = str(videoid) + "_" + str(timeinvideo) + "_tracking.png"
    box = str(id) + "_" + str(timeinvideo) + "_box_tracking.png"
    temp_file = str(uuid.uuid4()) + ".png"
    cv2.imwrite(temp_file, frame)
    s3.upload_file(temp_file, S3_BUCKET, S3_ANNOTATION_FOLDER +
                   no_box, ExtraArgs={'ContentType': 'image/png'})
    os.system('rm ' + temp_file)
    cv2.imwrite(temp_file, frame_w_box)
    s3.upload_file(temp_file, S3_BUCKET, S3_ANNOTATION_FOLDER +
                   box,  ExtraArgs={'ContentType': 'image/png'})
    os.system('rm ' + temp_file)
    cursor.execute(
        """
	 INSERT INTO annotations (
	 framenum, videoid, userid, conceptid, timeinvideo, x1, y1, x2, y2,
	 videowidth, videoheight, dateannotated, image, imagewithbox, comment, unsure, originalid)
	 VALUES (%d, %d, %d, %d, %f, %f, %f, %f, %f, %d, %d, %s, %s, %s, %s, %s, %d)
      """,
        (
            frame_num, videoid, TRACKING_ID, conceptid, timeinvideo, x1, y1,
            x2, y2, VIDEO_WIDTH, VIDEO_HEIGHT, datetime.datetime.now().date(), no_box, box,
            comment, unsure, id
        )
    )
    con.commit()
    return


def upload_video(priorFrames, postFrames, id):
    completed = False
    # Order priorFrames by time
    priorFrames.reverse()
    # Combine all frames
    priorFrames.extend(postFrames)

    output_file = str(uuid.uuid4()) + ".mp4"
    converted_file = str(uuid.uuid4()) + ".mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_file, fourcc, 20, (VIDEO_WIDTH, VIDEO_HEIGHT))
    for frame in priorFrames:
        out.write(frame)
    out.release()
    # Convert file so we can stream on s3
    temp = ['ffmpeg', '-loglevel', '0', '-i', output_file,
            '-codec:v', 'libx264', '-y', converted_file]
    subprocess.call(temp)

    if os.path.isfile(converted_file):
        # upload video..
        s3.upload_file(
            converted_file,
            S3_BUCKET,
            S3_VIDEO_FOLDER + str(id) + "_tracking.mp4",
            ExtraArgs={'ContentType': 'video/mp4'}
        )
        os.system('rm ' + converted_file)
        completed = True
    else:
        print("Failed to make video for annotations: " + str(id))
    os.system('rm ' + output_file)
    return completed


def matchS3Frame(priorFrames, postFrames, s3Image):
    best_score = 0
    best_index = None
    for index, (prior, post) in enumerate(
            zip_longest(reversed(priorFrames), postFrames)):
        if prior is not None:
            (prior_score, _) = compare_ssim(
                s3Image, prior, full=True, multichannel=True)
            if prior_score > best_score:
                best_score = prior_score
                best_index = -index
        if post is not None:
            (post_score, _) = compare_ssim(
                s3Image, post, full=True, multichannel=True)
            if post_score > best_score:
                best_score = post_score
                best_index = index
    return best_score, best_index


def fix_offset(priorFrames, postFrames, s3Image, fps, timeinvideo,
               frame_num, id, cursor, con):
    best_score, best_index = matchS3Frame(priorFrames, postFrames, s3Image)
    if best_index == 0:
        # No change necessary
        return priorFrames, postFrames, timeinvideo, frame_num
    elif best_score > .9:
        timeinvideo = round(timeinvideo + (best_index / fps), 2)
        frame_num = frame_num + best_index
        cursor.execute(
            '''
                UPDATE annotations
                SET framenum=%d, timeinvideo=%f, originalid=NULL
                WHERE id= %d;
            ''',
            (frame_num, timeinvideo, id,))
        con.commit()
    else:
        print(
            f'Failed on annnotation {id} with best score {best_score}')
        cursor.execute(
            "UPDATE annotations SET unsure=TRUE WHERE id=%d;", (id,))
        con.commit()
    if best_index > 0:
        tempFrames = postFrames[:best_index + 1]
        priorFrames = priorFrames + tempFrames
        del postFrames[:best_index]
    else:
        tempFrames = priorFrames[best_index - 1:]
        postFrames = tempFrames + postFrames
        del priorFrames[best_index:]
    return priorFrames, postFrames, timeinvideo, frame_num


def track_object(frame_num, frames, box, track_forward, end,
                 id, videoid, conceptid, comment, unsure,
                 cursor, con, TRACKING_ID, fps, timeinvideo):
    # Tracks the object forwards and backwards in a video
    frame_list = []
    time_elapsed = 0
    trackers = cv2.MultiTracker_create()
    # initialize tracking, add first frame (original annotation)
    tracker = OPENCV_OBJECT_TRACKERS["kcf"]()

    # keep tracking object until its out of frame or time is up
    for index, frame in enumerate(frames):
        time_elapsed += (1 / fps) if track_forward else - (1 / fps)
        frame_num += 1 if track_forward else -1
        frame_no_box = copy.deepcopy(frame)
        if index == 0:  # initialize bounding box in first frame
            trackers.add(tracker, frame, box)
        (success, boxes) = trackers.update(frame)
        if success:
            for box in boxes:
                (x, y, w, h) = [int(v) for v in box]
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            if index != 0:
                upload_image(frame_num, frame_no_box, frame, id, videoid,
                             conceptid, comment, unsure,
                             x, y, (x + w), (y + h),
                             cursor, con, TRACKING_ID,
                             round(timeinvideo + time_elapsed, 2))
        frame_list.append(frame)
    cv2.destroyAllWindows()
    return frame_list


def track_annotation(id, conceptid, timeinvideo, videoid, image,
                     videowidth, videoheight, x1, y1, x2, y2, comment, unsure):
    print("Start tracking annotation: " + str(id))
    con = connect(database=DB_NAME, host=DB_HOST,
                  user=DB_USER, password=DB_PASSWORD)
    cursor = con.cursor()

    # Make bounding box adjusted to video width and height
    x_ratio = (videowidth / VIDEO_WIDTH)
    y_ratio = (videoheight / VIDEO_HEIGHT)
    x1 = x1 / x_ratio
    y1 = y1 / y_ratio
    width = (x2 / x_ratio) - x1
    height = (y2 / y_ratio) - y1
    box = (x1, y1, width, height)

    TRACKING_ID = getTrackingUserid(cursor)
    url = getVideoURL(cursor, videoid)
    s3Image = getS3Image(image)
    if s3Image is None:
        return

    # initialize video for grabbing frames before annotation
    # start vidlen/2 secs before obj appears
    start = ((timeinvideo * 1000) - (LENGTH / 2))
    end = start + (LENGTH / 2)  # end when annotation occurs
    # Get frames tracking_vid_length/2 before timeinvideo
    # Note: if annotation timeinvideo=0 -> priorFrames = []
    priorFrames, _, _ = getVideoFrames(url, start, end)

    # initialize vars for getting frames post annotation
    start = timeinvideo * 1000
    end = start + (LENGTH / 2)
    postFrames, fps, frame_num = getVideoFrames(url, start, end)

    # Fix weird javascript video currentTime randomization
    priorFrames, postFrames, timeinvideo, frame_num = fix_offset(
        priorFrames, postFrames, s3Image, fps,
        timeinvideo, frame_num, id, cursor, con)

    # tracking forwards..
    postFrames = track_object(
        frame_num, postFrames, box, True, end,
        id, videoid, conceptid, comment, unsure,
        cursor, con, TRACKING_ID, fps, timeinvideo)

    # tracking backwards
    priorFrames = track_object(
        frame_num, reversed(priorFrames), box, False, 0,
        id, videoid, conceptid, comment, unsure,
        cursor, con, TRACKING_ID, fps, timeinvideo)

    upload_video(priorFrames, postFrames, id)

    cv2.destroyAllWindows()
    con.close()
    print("Done tracking annotation: " + str(id))
    return

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
from fix_offset import fix_offset
import json
import subprocess

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

# for testing
# def main():
#    con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
#    cursor = con.cursor()
#    cursor.execute("SELECT * FROM annotations WHERE id=9006")
#    row = cursor.fetchone()
#    track_annotation(row)


def get_next_frame(frames, video_object, num):
    if video_object:
        check, frame = frames.read()
        frame = frame if check else None
    else:
        if len(frames) == 0:
            return None
        frame = frames.pop()
    return frame

# Uploads images and puts annotation in database


def upload_image(frame_num, timeinvideo, frame, frame_w_box, annotation, x1, y1, x2, y2, cursor, con, TRACKING_ID):
    no_box = str(annotation.videoid) + "_" + str(timeinvideo) + "_tracking.png"
    box = str(annotation.id) + "_" + str(timeinvideo) + "_box_tracking.png"
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
            frame_num, annotation.videoid, TRACKING_ID, annotation.conceptid, timeinvideo, x1, y1,
            x2, y2, VIDEO_WIDTH, VIDEO_HEIGHT, datetime.datetime.now().date(), no_box, box,
            annotation.comment, annotation.unsure, annotation.id
        )
    )
    con.commit()


def increment_frame_num(video_object, frame_num):
    if video_object:
        frame_num += 1
    else:
        frame_num -= 1
    return frame_num

# Tracks the object forwards and backwards in a video


def track_object(frame_num, frames, box, video_object, end, original, cursor, con, TRACKING_ID, fps):
    frame_list = []
    trackers = cv2.MultiTracker_create()

    # initialize bounding box in first frame
    frame = get_next_frame(frames, video_object, 0)
    if frame is None:
        return []
    frame = cv2.resize(frame, (VIDEO_WIDTH, VIDEO_HEIGHT))
    frame_num = increment_frame_num(video_object, frame_num)

    # initialize tracking, add first frame (original annotation)
    tracker = OPENCV_OBJECT_TRACKERS["kcf"]()
    trackers.add(tracker, frame, box)
    (success, boxes) = trackers.update(frame)
    if success:
        for box in boxes:
            (x, y, w, h) = [int(v) for v in box]
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        frame_list.append(frame)
    counter = 1
    time_elapsed = 1/fps
    # keep tracking object until its out of frame or time is up
    while True:
        frame = get_next_frame(frames, video_object, counter)
        if frame is None:
            break
        frame_num = increment_frame_num(video_object, frame_num)
        frame = cv2.resize(frame, (VIDEO_WIDTH, VIDEO_HEIGHT))
        frame_no_box = copy.deepcopy(frame)
        (success, boxes) = trackers.update(frame)
        if success:
            for box in boxes:
                (x, y, w, h) = [int(v) for v in box]
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            frame_list.append(frame)
            timeinvideo = abs((1 + counter)/fps)
            if video_object:
                timeinvideo = timeinvideo + timeinvideo
            else:
                timeinvideo = timeinvideo - timeinvideo
            timeinvideo = round(timeinvideo, 2)
            upload_image(frame_num, timeinvideo, frame_no_box, frame,
                         original, x, y, (x+w), (y+h), cursor, con, TRACKING_ID)
            counter += 1
            time_elapsed += (1/fps)
        # make video at least 4 seconds long (2 before and 2 after annotation) even if object isn't tracked
        elif (time_elapsed < 2):
            frame_list.append(frame)
            counter += 1
            time_elapsed += (1/fps)
        else:
            break
        if (video_object and frames.get(0) > end):
            break
    cv2.destroyAllWindows()
    return frame_list

# original must be pgdb row


def track_annotation(original):
    print("Start tracking annotation: " + str(original.id))
    # Weird javascript time errors are fixed here
    timeinvideo = fix_offset(original.videoid, original.timeinvideo,
                             original.image, original.id)

    con = connect(database=DB_NAME, host=DB_HOST,
                  user=DB_USER, password=DB_PASSWORD)
    cursor = con.cursor()

    # get TRACKING userid
    cursor.execute("SELECT id FROM users WHERE username=%s", ("tracking",))
    TRACKING_ID = cursor.fetchone().id

    # get video name
    cursor.execute("SELECT filename FROM videos WHERE id=%s",
                   (str(original.videoid),))
    video_name = cursor.fetchone().filename

    # grab video stream
    url = s3.generate_presigned_url('get_object',
                                    Params={'Bucket': S3_BUCKET,
                                            'Key': S3_VIDEO_FOLDER + video_name},
                                    ExpiresIn=100)
    cap = cv2.VideoCapture(url)
    fps = cap.get(cv2.CAP_PROP_FPS)

    # initialize video for grabbing frames before annotation
    # start vidlen/2 secs before obj appears
    start = ((timeinvideo * 1000) - (LENGTH / 2))
    end = start + (LENGTH / 2)  # end when annotation occurs
    cap.set(0, start)  # tell video to start at 'start' time
    check = True
    frame_list = []
    curr = start

    while (check and curr <= end):
        check, vid = cap.read()
        if check:
            frame_list.append(vid)
        curr = cap.get(0)
    cap.release()
    # initialize vars for getting frames after annotation
    start = timeinvideo * 1000
    end = start + (LENGTH / 2)
    x_ratio = (original.videowidth / VIDEO_WIDTH)
    y_ratio = (original.videoheight / VIDEO_HEIGHT)
    x1 = original.x1 / x_ratio
    y1 = original.y1 / y_ratio
    width = (original.x2 / x_ratio) - x1
    height = (original.y2 / y_ratio) - y1
    box = (x1, y1, width, height)

    # new video capture object for frames after annotation
    vs = cv2.VideoCapture(url)
    vs.set(0, start)
    frames = vs
    frame_num = (int(frames.get(1)))
    # print("tracking forwards..")
    forward_frames = track_object(
        frame_num, frames, box, True, end, original, cursor, con, TRACKING_ID, fps)
    vs.release()
    # get object tracking frames prior to annotation
    frames = frame_list
    # print("tracking backwards..")
    reverse_frames = track_object(
        frame_num, frames, box, False, 0, original, cursor, con, TRACKING_ID, fps)
    reverse_frames.reverse()
    output_file = str(uuid.uuid4()) + ".mp4"
    converted_file = str(uuid.uuid4()) + ".mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_file, fourcc, 20, (VIDEO_WIDTH, VIDEO_HEIGHT))
    reverse_frames.extend(forward_frames)
    for frame in reverse_frames:
        out.write(frame)
#      cv2.imshow("Frame", frame)
#      cv2.waitKey(1)
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
            S3_VIDEO_FOLDER + str(original.id) + "_tracking.mp4",
            ExtraArgs={'ContentType': 'video/mp4'}
        )
        os.system('rm ' + converted_file)
    else:
        pass
        print("Failed to make video for annotations: " + str(original.id))
    os.system('rm ' + output_file)
    cv2.destroyAllWindows()
    con.close()
    print("Done tracking annotation: " + str(original.id))

# if __name__ == '__main__':
#  main()

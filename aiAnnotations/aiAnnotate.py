# USAGE
# python tracking.py

# import the necessary packages
from imutils.video import VideoStream
import imutils
import cv2
from pgdb import connect
import boto3
import os
from dotenv import load_dotenv
import datetime
import copy

load_dotenv(dotenv_path="../.env")

# aws stuff
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id = AWS_ACCESS_KEY_ID, aws_secret_access_key = AWS_SECRET_ACCESS_KEY)

# connect to db
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
con = connect(database=DB_NAME, host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
cursor = con.cursor()

# video/image properties
length = 4000 # length of video before and after annotation in ms (ex: length = 4000, vid = 8 s max)
images_per_sec = 10
VIDEO_WIDTH = 640
VIDEO_HEIGHT = 360

# get annotations from Ali
cursor.execute("SELECT * FROM annotations WHERE userid=6")
rows = cursor.fetchmany(1)

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


#get AI userid
cursor.execute("SELECT id FROM users WHERE username=%s", ("ai",))
AI_id = cursor.fetchone().id

def get_next_frame(frames, video_object, num):
	if video_object:
		check, frame = frames.read()
	else:
		frame = frames.pop()
	return frame

def upload_image(name, frame, frame_w_box, annotation, x1, y1, x2, y2):
	no_box = str(annotation.id) + "_" + name + "_ai.png"
	box = str(annotation.id) + "_" + name + "_box_ai.png"
	cv2.imwrite("img.png", frame)
	s3.upload_file("img.png", S3_BUCKET, os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER") + no_box) 
	cv2.imwrite("img_box.png", frame_w_box)
	s3.upload_file("img_box.png", S3_BUCKET, os.getenv("AWS_S3_BUCKET_ANNOTATIONS_FOLDER") + box)
	cursor.execute(
		"""
			INSERT INTO annotations (
			videoid, userid, conceptid, timeinvideo, x1, y1, x2, y2, 
			videowidth, videoheight, dateannotated, image, imagewithbox, comment, unsure, originalid) 
			VALUES (%d, %d, %d, %f, %f, %f, %f, %f, %d, %d, %s, %s, %s, %s, %s, %d)
		""",
		(
			annotation.videoid, AI_id, annotation.conceptid, annotation.timeinvideo, x1, y1, 
			x2, y2, VIDEO_WIDTH, VIDEO_HEIGHT, datetime.datetime.now().date(), no_box, box, 
			annotation.comment, annotation.unsure, annotation.id
		)
	)
	con.commit()

def track_object(frames, box, video_object, end):
        frame_list = []
        trackers = cv2.MultiTracker_create()
        
        # initialize bounding box in first frame
        frame = get_next_frame(frames, video_object, 0)
        frame = imutils.resize(frame, width=640, height=360)

        tracker = OPENCV_OBJECT_TRACKERS["kcf"]()
        trackers.add(tracker, frame, box)
        counter = 0
        images_counter = 20 / images_per_sec # vids are about 20 fps

        while True:
                frame = get_next_frame(frames, video_object, counter)
                if frame is None:
                        break
                frame = imutils.resize(frame, width=VIDEO_WIDTH, height=VIDEO_HEIGHT)
                frame_no_box = copy.deepcopy(frame)
                (success, boxes) = trackers.update(frame)
                if success:
                        for box in boxes:
                                (x, y, w, h) = [int(v) for v in box]
                                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                        frame_list.append(frame)
                        if (counter % images_counter == 0):
                                upload_image(str(int(counter // images_counter)), frame_no_box, frame, i, x, y, (x+w), (y+h))
                        counter += 1
                else:
                        break
                if (video_object and frames.get(0) > end): # only check for forward tracking
                        break
        cv2.destroyAllWindows()
        return frame_list

def ai_annotation(original):
	# get video name
	cursor.execute("SELECT filename FROM videos WHERE id=%s", str(original.videoid))
	video_name = cursor.fetchone().filename

	# grab video stream
	url = s3.generate_presigned_url('get_object', 
		Params = {'Bucket': S3_BUCKET, 
		'Key': os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER') + video_name}, 
		ExpiresIn = 100)
	cap = cv2.VideoCapture(url)

	# initialize video for grabbing frames before annotation
	start = ((original.timeinvideo * 1000) - length) # start 3 secs before obj appears
	end = start + length # end when annotation occurs
	cap.set(0, start) # tell video to start at 'start' time
	check = True
	frame_list = []
	curr = start

	while (check and curr <= end):
		check, vid = cap.read()
		vid = imutils.resize(vid, width=VIDEO_WIDTH, height=VIDEO_HEIGHT)
		frame_list.append(vid)
		curr = int(cap.get(0))

	cap.release()
	cv2.destroyAllWindows()

	# initialize vars for getting frames after annotation
	start = original.timeinvideo * 1000
	end = start + length
	x1 = original.x1 / 2
	y1 = original.y1 / 2
	width = (original.x2 / 2) - x1
	height = (original.y2 / 2) - y1
	box = (x1, y1, width, height)

	# get object tracking frames prior to annotation
	frames = frame_list
	reverse_frames = track_object(frames, box, False, 0)
	reverse_frames.reverse()

    # new video capture object for frames after annotation
	vs = cv2.VideoCapture(url)
	vs.set(0, start)
	frames = vs
	forward_frames = track_object(frames, box, True, start + length)
	vs.release()

	print("writing final video..")
	out = cv2.VideoWriter('output.mp4', cv2.VideoWriter_fourcc('M','P','4', 'V'), 20, (VIDEO_WIDTH, VIDEO_HEIGHT))
	reverse_frames.extend(forward_frames)
	for frame in reverse_frames:
		out.write(frame)		
		cv2.imshow("Frame", frame)
		cv2.waitKey(1)
	'''
	#upload video..
	(s3.upload_file('output.mp4',
	S3_BUCKET, 
	os.getenv("AWS_S3_BUCKET_TRACKING_FOLDER") + str(original.id) + "_ai.mp4", 
	ExtraArgs = {'ContentType':'video/mp4'}))
	'''
	cap.release()
	cv2.destroyAllWindows()

for i in rows:
	ai_annotation(i)
con.close()

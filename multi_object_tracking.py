# USAGE
# python multi_object_tracking.py --video videos/soccer_01.mp4 --tracker csrt

# import the necessary packages
from imutils.video import VideoStream
import argparse
import imutils
import time
import cv2

# construct the argument parser and parse the arguments
ap = argparse.ArgumentParser()
ap.add_argument("-v", "--video", type=str,
	help="path to input video file")
ap.add_argument("-t", "--tracker", type=str, default="kcf",
	help="OpenCV object tracker type")
args = vars(ap.parse_args())

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

# initialize vars
start = 4305
end = start + 2000
x1 = 382 # x1/2 
y1 = 25 # y1/2 
width = 100 # (x2 - x1) / 2
height = 111 # (y2 - y1) / 2 
counter = 0
box = (x1, y1, width, height)

# initialize OpenCV's special multi-object tracker
trackers = cv2.MultiTracker_create()

# grab a reference to the video file
vs = cv2.VideoCapture(args["video"])
# tell video to start at start time (in milliseconds)
vs.set(0, start) 
# Define videowriter object for output video
out = cv2.VideoWriter('output.mp4',cv2.VideoWriter_fourcc('M','P','4', 'V'), 20, (640, 360))

# initialize bounding box in first frame
frame = vs.read()
frame = frame[1] if args.get("video", False) else frame
frame = imutils.resize(frame, width=640, height=360)
out.write(frame)
cv2.imshow("Frame", frame)
cv2.waitKey(1)
tracker = OPENCV_OBJECT_TRACKERS[args["tracker"]]()
trackers.add(tracker, frame, box)

# loop over frames from the video stream
while True:
	# grab the current frame, then handle if we are using a
	# VideoStream or VideoCapture object
	frame = vs.read()
	frame = frame[1] if args.get("video", False) else frame

	# check to see if we have reached the end of the stream
	if frame is None:
		break

	# resize the frame (so we can process it faster)
	frame = imutils.resize(frame, width=640, height=360)

	# grab the updated bounding box coordinates (if any) for each
	# object that is being tracked
	(success, boxes) = trackers.update(frame)

	# loop over the bounding boxes and draw then on the frame
	for box in boxes:
		(x, y, w, h) = [int(v) for v in box]
		cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

	# show the output frame
	counter += 1
#	cv2.imwrite(str(counter) + ".png", frame)
	out.write(frame)
	cv2.imshow("Frame", frame)
	cv2.waitKey(1) 

	# check if its been 2 s
	current = int(vs.get(0))
	if (end <= current + 10) and (end >= current - 10):
		break 

vs.release()

# close all windows
cv2.destroyAllWindows()

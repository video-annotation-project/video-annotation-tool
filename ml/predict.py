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

NUM_FRAMES = 10 # run prediction on every NUM_FRAMES

#Load environment variables
load_dotenv(dotenv_path="../.env")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
s3 = boto3.client('s3', aws_access_key_id = AWS_ACCESS_KEY_ID, aws_secret_access_key = AWS_SECRET_ACCESS_KEY)
S3_VIDEO_FOLDER = os.getenv('AWS_S3_BUCKET_VIDEOS_FOLDER')

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

model_path = config['model_weights']

trackers = cv2.MultiTracker_create()

class Tracked_object:

   def __init__(self, detection):
      (x1, y1, x2, y2) = detection[0]
      self.x1 = x1
      self.x2 = x2
      self.y1 = y1
      self.y2 = y2
#      self.concept = concept
      self.matched = True

   def update(self, detection):
      (x1, y1, x2, y2) = detection[0]
      self.x1 = x1
      self.x2 = x2
      self.y1 = y1
      self.y2 = y2
      self.matched = True

   def set_unmatched(self):
      self.matched = False

def main():
   print("Loading Video")
   frames = get_video_frames("DocRicketts-0701_20141216T212020Z_00-48-12-26TC_h264.mp4")
   print("Initializing Model")
   model = init_model()
   print("Predicting")
   predicted_frames = predict_frames(frames, model) 
   display_video(predicted_frames) 

def get_video_frames(video_name):
   frames = []
   # grab video stream
   url = s3.generate_presigned_url('get_object',
            Params = {'Bucket': S3_BUCKET,
                      'Key': S3_VIDEO_FOLDER + video_name},
                       ExpiresIn = 100)
   vid = cv2.VideoCapture(url)
   print(url)
   while not vid.isOpened():
      continue
   print("Successfully opened video.")
   # put frames into frame list
   check = True
#   while True:
   for i in range(0, 3750): 
      check, frame = vid.read()
      if not check:
         break
      frame = cv2.resize(frame,(640,480))
      frames.append(frame)
   vid.release()
   return frames

def init_model():
   model = load_model(model_path, backbone_name='resnet50')
   model = convert_model(model)
   return model

def predict_frames(video_frames, model):
   currently_tracked_objects = []
   frame_counter = 0
   frame_list = []
   for frame in range(0, len(video_frames), NUM_FRAMES):
      # set each tracked object as unmatched for new frame
      for tracked_object in currently_tracked_objects:
         tracked_object.set_unmatched()
      detections = get_predictions(copy.deepcopy(video_frames[frame]), model)
      # try to match the currently tracked objects with the detections of this frame
      for detection in detections:
         # detection = class, bbox coords, confidence level
         match, matched_object = does_match_existing_tracked_object(detection, currently_tracked_objects)
         if match:
             matched_object.update(detection)
         else:
            currently_tracked_objects.append(Tracked_object(detection))
      if (frame + NUM_FRAMES - 1 >= len(video_frames)):
         stop = len(video_frames)
      else:
         stop = frame + NUM_FRAMES - 1
      # clean up unmatched tracked objects
      for tracked_object in currently_tracked_objects:
         if not tracked_object.matched:
            currently_tracked_objects.remove(tracked_object)
      track_detections(currently_tracked_objects, video_frames, frame, stop)
   return video_frames

def get_predictions(frame, model):
   frame = np.expand_dims(frame, axis=0)
   boxes, scores, labels = model.predict_on_batch(frame)

   thresholds = [.25,.25,.25,.25,.25]
   predictions = zip (boxes[0],scores[0],labels[0])
   filtered_predictions = []
   for box, score,label in predictions:
      if thresholds[label] > score:
         continue
      filtered_predictions.append((box,score,label))
   return filtered_predictions

# Tracks and adds bounding boxes for detected objects in video frames from start to stop frame.
# Works in place, so no extra memory use! Woot
# add new tracker for unmatched objects, use same tracker for matched objects
def track_detections(currently_tracked_objects, video_frames, start, stop):
   global trackers
   frame_list = [] 
   frame = video_frames[start]
   for obj in currently_tracked_objects:
      if not obj.matched:
         width = obj.x2 - obj.x1
         height = obj.y2 - obj.y1
         box = (obj.x1, obj.y1, width, height)
         trackers.add(cv2.TrackerKCF_create(), frame, box)
   for frame in video_frames[start:stop]:
      (success, boxes) = trackers.update(frame)
      if success:
         for box in boxes:
            (x, y, w, h) = [int(v) for v in box]
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

def display_video(frames):
   fourcc = cv2.VideoWriter_fourcc(*'mp4v')
   out = cv2.VideoWriter('output.mp4',fourcc, 30.0, frames[0].shape[::-1][1:3])
   for frame in frames:
#      cv2.imshow("Frame", frame)
#      cv2.waitKey(int(1000/30))
      out.write(frame)
   out.release()
   cv2.destroyAllWindows()

def does_match_existing_tracked_object(detection, currently_tracked_objects):
    # calculate IOU for each
   max_iou = 0 
   match = None
   for obj in currently_tracked_objects:
       (x1, y1, x2, y2) = detection[0]
       # determine the (x, y)-coordinates of the intersection rectangle
       xA = max(x1, obj.x1)
       yA = max(y1, obj.y1)
       xB = min(x2, obj.x2)
       yB = min(y2, obj.y2)
       # compute the area of intersection rectangle
       interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)
       # compute the area of both the prediction and ground-truth
       # rectangles
       boxAArea = (x2 - x1 + 1) * (y2 - y1 + 1)
       boxBArea = (obj.x2 - obj.x1 + 1) * (obj.y2 - obj.y1 + 1)
       # compute the intersection over union by taking the intersection
       # area and dividing it by the sum of prediction + ground-truth
       # areas - the interesection area
       iou = interArea / float(boxAArea + boxBArea - interArea)
       if (iou > max_iou):
          max_iou = iou
          match = obj
   if max_iou >= 0.70:               
      print("match")
      return True, match
   return False, None

if __name__ == '__main__':
  main()

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

def main():
   frames = get_video_frames("Ventana-3788_20140625T202207Z_01-59-42-20TC_h264.mp4")
   print("initializing model")
   model = init_model()
   print("predicting")
   predicted_frames = predict_frames(frames, model) 
   display_video(predicted_frames) 

class tracked_object:

   def __init__(self, x1, x2, y1, y2, concept):
      self.x1 = x1
      self.x2 = x2
      self.y1 = y1
      self.y2 = y2
      self.concept = concept
      self.matched = True

   def update(self, x1, x2, y1, y2):
      self.x1 = x1
      self.x2 = x2
      self.y1 = y1
      self.y2 = y2
      self.matched = True

   def set_unmatched(self):
      self.matched = False

def init_model():
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
   model = load_model(model_path, backbone_name='resnet50')
   model = convert_model(model)
   return model

def display_video(frames):
   for frame in frames:
      cv2.imshow("Frame", frame)
      cv2.waitKey(1)
   cv2.destroyAllWindows()

def get_video_frames(video_name):
   frames = []
   # grab video stream
   url = s3.generate_presigned_url('get_object',
            Params = {'Bucket': S3_BUCKET,
                      'Key': S3_VIDEO_FOLDER + video_name},
                       ExpiresIn = 100)
   vid = cv2.VideoCapture(url)
   print("getting video frames..")
   # put frames into frame list
   check = True
   counter = 0
   while check and counter <= 500:  
      check, frame = vid.read()
      frames.append(frame)
      counter += 1
   vid.release()
   return frames

def predict_frames(video_frames, model):
   currently_tracked_objects = []
   frame_counter = 0
   frame_list = []
   for frame in range(0, len(video_frames), NUM_FRAMES):
      # set each tracked object as unmatched for new frame
      for tracked_object in currently_tracked_objects:
         tracked_object.set_unmatched()
      # try to match the currently tracked objects with the detections of this frame
      detections = get_predictions(copy.deepcopy(frame), model)
      for detection in detections:
         # detection = class, bbox coords, confidence level
         match, matched_object = does_match_existing_tracked_object(detection, currently_tracked_objects)
         # if it matches, update the tracked object position
         if match:
            matched_object.update(detection)
         # else, assign unmatched detection to new tracked object
         else:
            currently_tracked_objects.add(tracked_object(detection))
      # clean up unmatched tracked objects
      if (frame_counter + NUM_FRAMES - 1 >= len(video_frames)):
         next_frames = video_frames[frame_counter : ]
      else:
         next_frames = video_frames[frame_counter : (frame_counter + NUM_FRAMES - 1)]
      tracked_frames = get_tracked_frames(detections, next_frames)
      frame_list.append(tracked_frames)
      frame_counter += NUM_FRAMES
      for tracked_object in currently_tracked_objects:
         if not tracked_object.matched:
            currently_tracked_objects.remove(tracked_object)
   return frame_list
 
def get_predictinos(frame, model):
   frame = np.expand_dims(frame, axis=0)
   boxes, scores, labels = model.predict_on_batch(inputs)

   thresholds = [.1,.1,.1,.1,.1]
   predictions = zip (boxes[0],scores[0],labels[0])
   filtered_predictions = []
   for box, score,label in predictions:
      if thresholds[label] > score:
         continue
      filtered_predictions.append((box,score,label))

def get_tracked_frames(detections, video_frames):
   frame_list = [] 
   trackers = cv2.MultiTracker_create()
   frame = video_frames[0]
   for detection in detections:
      (x1, y1, x2, y2) = detections[0]
      width = x2 - x1
      height = y2 - y1
      box = (x1, y1, width, height)
      trackers.add(cv2.TrackerKCF_create(), frame, box)
   for frame in video_frames:
      (success, boxes) = trackers.update(frame)
      if success:
         for box in boxes:
            (x, y, w, h) = [int(v) for v in box]
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
         frame_list.append(frame)
         cv2.imshow("Frame", frame)
         cv2.waitKey(1)
   return frame_list


def does_match_existing_tracked_object(detection, currently_tracked_objects):
   return True
   #UPDATE - determine confidence level + distance metric to deem match or not


if __name__ == '__main__':
  main()

import json
import numpy as np
import copy
import os
from loading_data import queryDB
import pandas as pd
import predict

VIDEO_NUM = 86
IOU_THRESH = 0.25
FPS = 29.97002997002997
RESIZED_WIDTH = 640
RESIZED_HEIGHT = 480

config_path = 'config.json'

with open(config_path) as config_buffer:
   config = json.loads(config_buffer.read())

model_path = config['model_weights']
num_concepts = len(config['conceptids'])
class_map_file = config['class_map']
concepts = config['conceptids']
classmap = pd.read_csv(class_map_file, header=None).to_dict()[0]

def main():
    video_name = queryDB("select * from videos where id = " + str(VIDEO_NUM)).iloc[0].filename
    results = predict.main(video_name)
    print("done predicting")

    # REMOVE BAD USERS ?
    annotations = queryDB('select * from annotations where videoid= ' + str(VIDEO_NUM) 
        + ' and userid!=17') # and timeinvideo > 160 and timeinvideo < 190')
    annotations['frame_num'] = np.rint(annotations['timeinvideo'] * FPS).astype(int)

    metrics = score_predictions(annotations, results, IOU_THRESH, concepts)
    concept_counts = get_counts(results, annotations)
    metrics = metrics.set_index('conceptid').join(concept_counts)

    metrics.to_csv('metrics' + VIDEO_NUM + '.csv')
    print(metrics)

def score_predictions(validation, predictions, iou_thresh, concepts):
    # Maintain a set of predicted objects to verify
    detected_objects = []
    obj_map = predictions.groupby('objectid', sort=False).conceptid.max()
    
    # group predictions by video frames
    predictions = predictions.groupby('frame_num', sort=False)
    predictions = [df for _, df in predictions]
    
    # mapping frames to predictions index
    frame_data = {}
    for i, group in enumerate(predictions):
        frame_num = group.iloc[0]['frame_num']
        frame_data[frame_num] = i
    
    # group validation annotations by frames
    validation = validation.apply(resize, axis=1)
    validation = validation.groupby('frame_num', sort=False)
    validation = [df for _, df in validation]
    
    # initialize counters for each concept
    true_positives = dict(zip(concepts,[0] * len(concepts)))
    false_positives = dict(zip(concepts,[0] * len(concepts)))
    false_negatives = dict(zip(concepts,[0] * len(concepts)))
    
    # get true and false positives for each frame of validation data
    for group in validation:
        try: # get corresponding predictions for this frame
            frame_num = group.iloc[0]['frame_num']
            predicted = predictions[frame_data[frame_num]]
        except:
            continue # False Negatives already covered
            
        detected_truths = dict(zip(concepts, [0] * len(concepts)))
        for index, truth in group.iterrows():
            for index, prediction in predicted.iterrows():
                if (prediction.conceptid == truth.conceptid
                        and compute_overlap(truth, prediction) > iou_thresh
                        and prediction.objectid not in detected_objects):
                    detected_objects.append(prediction.objectid)
                    true_positives[prediction.conceptid] += 1
                    detected_truths[prediction.conceptid] += 1
                    
        # False Negatives (Missed ground truth predicitions)
        counts = group.conceptid.value_counts()
        for concept in concepts:
            count = counts[concept] if (concept in counts.index) else 0
            false_negatives[concept] += count - detected_truths[concept]
    
    # False Positives (No ground truth prediction at any frame for that object)
    undetected_objects = set(obj_map.index) - set(detected_objects)
    for obj in undetected_objects:
        concept = obj_map[obj]
        false_positives[concept] += 1
    
    metrics = pd.DataFrame()
    for concept in concepts:
        TP = true_positives[concept]
        FP = false_positives[concept]
        FN = false_negatives[concept]
        precision = TP / (TP + FP) if (TP + FP) != 0 else 0
        recall = TP / (TP + FN) if (TP + FN) != 0 else 0
        f1 = (2*recall*precision / (precision+recall)) if (precision+recall) != 0 else 0
        metrics = metrics.append([[concept, TP, FP, FN, precision, recall, f1]])
    metrics.columns = ['conceptid', 'TP', 'FP', 'FN', 'Precision', 'Recall', 'F1']
    return metrics


def resize(row):
    x_ratio = (row.videowidth / RESIZED_WIDTH)
    y_ratio = (row.videoheight / RESIZED_HEIGHT)
    row.videowidth = RESIZED_WIDTH
    row.videoheight = RESIZED_HEIGHT
    row.x1 = row.x1 / x_ratio
    row.x2 = row.x2 / x_ratio
    row.y1 = row.y1 / y_ratio
    row.y2 = row.y2 / y_ratio
    return row

# test counts
def get_counts(results, annotations):
    grouped = results.groupby(['objectid']).label.mean().reset_index()
    counts = grouped.groupby('label').count()
    counts.columns = ['pred_num']
    groundtruth_counts = pd.DataFrame(annotations.groupby('conceptid').id.count())
    groundtruth_counts.columns = ['true_num']
    return pd.concat((counts, groundtruth_counts), axis=1, join='outer').fillna(0)

# Get the IOU value for two different annotations
def compute_overlap(A, B):
    # if there is no overlap in x dimension
    if B.x2 - A.x1 < 0 or A.x2 - B.x1 < 0:
        return 0
    # if there is no overlap in y dimension
    if B.y2 - A.y1 < 0 or A.y2 - B.y1 < 0:
        return 0
    areaA = (A.x2 - A.x1) * (A.y2 - A.y1)
    areaB = (B.x2 - B.x1) * (B.y2 - B.y1)
    width = min(A.x2, B.x2) - min(A.x1, B.x1)
    height = min(A.y2, B.y2) - min(A.y1, B.y1)
    area_intersect = height * width
    iou = area_intersect / (areaA + areaB - area_intersect)
    return iou


if __name__ == '__main__':
  main()

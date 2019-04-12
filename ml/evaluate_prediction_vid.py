import json
import numpy as np
import copy
import os
from loading_data import queryDB
import pandas as pd
import predict

config_path = 'config.json'

fps = 29.97002997002997

with open(config_path) as config_buffer:
   config = json.loads(config_buffer.read())

model_path = config['model_weights']
num_concepts = len(config['conceptids'])
class_map_file = config['class_map']
concepts = config['conceptids']
classmap = pd.read_csv(class_map_file, header=None).to_dict()[0]

def main():
    video_num = 24
    video_name = queryDB("select * from videos where id = " + str(video_num)).iloc[0].filename
    
    results = predict.main(video_name)
    print("done predicting")
    results = get_conceptids(results)

    #NEED TO REMOVE BAD USERS
    annotations = queryDB('select * from annotations where videoid= ' + str(video_num) + ' and userid!=17') #and timeinvideo > 160 and timeinvideo < 190')
    annotations['frame_num'] = np.rint(annotations['timeinvideo'] * fps)

    groundtruth_counts = pd.DataFrame(annotations.groupby('conceptid').id.count())
    groundtruth_counts.columns = ['true_num']
    

    grouped = results.groupby(['objectid']).label.mean().reset_index()
    counts = grouped.groupby('label').count()
    counts.columns = ['pred_num']
    
    df = pd.concat((counts, groundtruth_counts), axis=1, join='outer').fillna(0)
    df['accuracy'] = (df.true_num - (df.true_num - df.pred_num).abs()) / df.true_num
    print(df)

    #scores = score_predictions(annotations, results, .1, concepts, fps)


def score_predictions(validation,predictions,iou_thresh, concepts, fps):
    # group predictions by video frames
    predictions = predictions.groupby(['videoid','frame_num'], sort=False)
    predictions = [df for _, df in predictions]
    
    # mapping annotations from prediction list to video/time
    frame_data = {}
    for i, group in enumerate(predictions):
        frame_num = group.iloc[0]['frame_num']
        video = group.iloc[0]['videoid']
        frame_data[(video,frame_num)] = i
    
    # group validation annotations by video frames
    validation = validation.groupby(['videoid','frame_num'], sort=False)
    validation = [df for _, df in validation]
    
    # initialize counters for each concept
    true_positives = dict(zip(concepts,[0] * len(concepts)))
    false_positives = dict(zip(concepts,[0] * len(concepts)))
    false_negatives = dict(zip(concepts,[0] * len(concepts)))
    
    # get true and false positives for each frame of validation data
    for group in validation:
        #get frame and video for this set
        frame_num = group.iloc[0]['frame_num']
        video = group.iloc[0]['videoid']
        
        #get corresponding predictions for this set
        try:
            predicted = predictions[frame_data[(video,frame_num)]]
        except:
            print("prediction not found")
            continue
            
        #go through predictions and identify false positives/false negatives/ true_positives
        detected_predictions = []
        detected_truths = dict(zip(concepts,[0] * len(concepts)))
        for index, truth in group.iterrows():
            for index, prediction in predicted.iterrows():
                if prediction.id in detected_predictions or compute_overlap(truth,prediction) < iou_thresh or prediction.conceptid != truth.conceptid:
                    continue
                detected_predictions.append(prediction.id)
                if truth.conceptid == prediction.conceptid:
                    true_positives[prediction.conceptid] += 1
                    detected_truths[prediction.conceptid] += 1
                else:
                    false_positives[prediction.conceptid] += 1

        for id in concepts:
            false_negatives[id] += len(group.loc[group['conceptid'] == id]) - detected_truths[id]
        #count number of annotations that were correct, wrong, and missed
        
    f1 = dict(zip(concepts,[0] * len(concepts)))
    for id in concepts:
        try:
            recall = true_positives[id] / (true_positives[id] + false_negatives[id])
            precision = true_positives[id] / (true_positives[id] + false_positives[id])
            f1[id] = 2*recall*precision / (precision+recall)
        except:
            f1[id] = 0
    
    return f1

# Get the IOU value for two different annotations
def compute_overlap(annotationA, annotationB):
    # if there is no overlap in x dimension
    if annotationB.x2 - annotationA.x1 < 0 or annotationA.x2 - annotationB.x1 < 0:
        return 0
    # if there is no overlap in y dimension
    if annotationB.y2 - annotationA.y1 < 0 or annotationA.y2 - annotationB.y1 < 0:
        return 0
    
    areaA = (annotationA.x2-annotationA.x1) * (annotationA.y2-annotationA.y1)
    areaB = (annotationB.x2-annotationB.x1) * (annotationB.y2-annotationB.y1)

    width = min(annotationA.x2,annotationB.x2) - min(annotationA.x1,annotationB.x1)
    height = min(annotationA.y2,annotationB.y2) - min(annotationA.y1,annotationB.y1)
    
    area_intersect = height * width
    iou = area_intersect / (areaA + areaB - area_intersect)
    
    return iou

# Given a list of annotations(some with or without labels/confidence scores) for multiple objects choose a label for each object
def get_conceptids(annotations):
    label = None
    objects = annotations.groupby(['objectid'])
    for oid, group in objects:
        scores = {}
        for k , label in group.groupby(['label']):
            scores[k] = label.confidence.mean() # Maybe the sum?
        idmax = max(scores.keys(), key=(lambda k: scores[k]))
        annotations.loc[annotations.objectid == oid,'label'] = idmax
    annotations['label'] = annotations['label'].apply(lambda x: concepts[int(x)])
    annotations['conceptid'] = annotations['label']
    return annotations

if __name__ == '__main__':
  main()

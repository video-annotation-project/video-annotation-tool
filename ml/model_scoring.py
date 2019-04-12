import keras
import numpy as np
import os
from keras_retinanet.utils.eval import _get_detections
from keras_retinanet.utils.eval import _get_annotations
from keras_retinanet.utils.anchors import compute_overlap



def f1_evaluation(generator,model,iou_threshold=0.5,score_threshold=0.05,max_detections=100,save_path=None):
    """ Evaluate a given dataset using a given model.
    # Arguments
        generator       : The generator that represents the dataset to evaluate.
        model           : The model to evaluate.
        iou_threshold   : The threshold used to consider when a detection is positive or negative.
        score_threshold : The score confidence threshold to use for detections.
        max_detections  : The maximum number of detections to use per image.
        save_path       : The path to save images with visualized detections to.
    # Returns
        A dict mapping class names to mAP scores.
    """
    # gather all detections and annotations
    all_detections     = _get_detections(generator, model, score_threshold=score_threshold, max_detections=max_detections, save_path=save_path)
    all_annotations    = _get_annotations(generator)
    best_thresh = {}
    best_f1 = {}
    # process detections and annotations
    for label in range(generator.num_classes()):
        if not generator.has_label(label):
            continue

        false_positives = np.zeros((0,))
        true_positives  = np.zeros((0,))
        scores          = np.zeros((0,))
        num_annotations = 0.0

        for i in range(generator.size()):
            detections           = all_detections[i][label]
            annotations          = all_annotations[i][label]
            num_annotations     += annotations.shape[0]
            detected_annotations = []

            for d in detections:
                scores = np.append(scores, d[4])

                if annotations.shape[0] == 0:
                    false_positives = np.append(false_positives, 1)
                    true_positives  = np.append(true_positives, 0)
                    continue

                overlaps            = compute_overlap(np.expand_dims(d, axis=0), annotations)
                assigned_annotation = np.argmax(overlaps, axis=1)
                max_overlap         = overlaps[0, assigned_annotation]

                if max_overlap >= iou_threshold and assigned_annotation not in detected_annotations:
                    false_positives = np.append(false_positives, 0)
                    true_positives  = np.append(true_positives, 1)
                    detected_annotations.append(assigned_annotation)
                else:
                    false_positives = np.append(false_positives, 1)
                    true_positives  = np.append(true_positives, 0)

        # no annotations -> AP for this class is 0 (is this correct?)
        if num_annotations == 0:
            continue

        # sort by score
        indices         = np.argsort(-scores)
        scores = scores[indices]
        false_positives = false_positives[indices]
        true_positives  = true_positives[indices]

        # compute false positives and true positives
        false_positives = np.cumsum(false_positives)
        true_positives  = np.cumsum(true_positives)

        # compute recall and precision
        recall    = true_positives / num_annotations
        precision = true_positives / np.maximum(true_positives + false_positives, np.finfo(np.float64).eps)

        # recall, precision, and scores(confidence level) are arrays for a given class with values for each image
        f1_points = []

        # Compute f1 scores
        for r, p in zip(recall,precision):
            if r + p == 0:    #if precision and recall are 0, f1 becomes 0
                f1_points.append(0) 
            else:
                f1_points.append((2 * r * p) / (r + p))
        
        if len(f1_points) == 0:
            best_f1[label] = 0
            best_thresh[label] = 0
            continue

        f1_points = np.array(f1_points)
        best_f1[label] = np.max(f1_points)
        best_thresh[label] = scores[np.argmax(f1_points)]

    # These are the best possible f1 score for each class
    # These are the corresponding threshold values to achieve these maximum f1 scores.
    return best_f1, best_thresh

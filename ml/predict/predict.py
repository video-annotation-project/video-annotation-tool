import copy
import os
import uuid
import datetime
import itertools
import sys

import cv2
import numpy as np
import pandas as pd
import subprocess

from config import config
from utils.query import pd_query
from memory_profiler import profile

fp = open('memory_profiler.log', 'w+')


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
        (x1, y1, x2, y2) = detection.box
        self.id = uuid.uuid4()
        self.x1 = x1
        self.x2 = x2
        self.y1 = y1
        self.y2 = y2
        self.box = (x1, y1, (x2 - x1), (y2 - y1))
        self.tracker = cv2.TrackerKCF_create()
        self.tracker.init(frame, self.box)
        label = detection.label
        confidence = detection.score
        self.save_annotation(frame_num, label=label, confidence=confidence)
        self.tracked_frames = 0

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
        (x1, y1, x2, y2) = detection.box
        self.x1 = x1
        self.x2 = x2
        self.y1 = y1
        self.y2 = y2
        self.box = (x1, y1, (x2 - x1), (y2 - y1))
        self.tracker = cv2.TrackerKCF_create()
        self.tracker.init(frame, self.box)
        label = detection.label
        confidence = detection.score
        self.annotations = self.annotations[:-1]
        self.save_annotation(frame_num, label=label, confidence=confidence)
        self.tracked_frames = 0

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
        self.tracked_frames += 1
        return success

    def change_id(self, matched_obj_id):
        self.id = matched_obj_id
        self.annotations['objectid'] = matched_obj_id

    def get_BB(self):
        return [self.x1, self.y1, self.x2, self.y2]


@profile(stream=fp)
def predict_on_video(videoid, model_weights, concepts, filename, video_capture,
                     upload_annotations=False, userid=None, collection_id=None,
                     collections=None, local_con=None, s3=None, gpu_id=None):
    print("Initializing Model")
    model = init_model(model_weights, gpu_id)

    printing_with_time("Predicting")
    results = predict_frames(video_capture, model,
                             videoid, concepts, collections, local_con)
    if (results.empty):
        print("no predictions")
        return results

    results = propagate_conceptids(results)
    results = length_limit_objects(results, config.MIN_FRAMES_THRESH)
    print(f'Number of model annotations {len(results)}')

    if upload_annotations:
        printing_with_time("Uploading annotations")
        # filter results down to middle frames
        mid_frame_results = get_final_predictions(results)
        cursor = local_con.cursor()
        # upload these annotations
        mid_frame_results.apply(
            lambda prediction: handle_annotation(prediction, video_capture, videoid,
                                                 config.RESIZED_HEIGHT,
                                                 config.RESIZED_WIDTH, userid,
                                                 collection_id, cursor=cursor,
                                                 s3=s3), axis=1)
        local_con.commit()

    return results


def init_model(model_path, gpu_id):
    os.environ["CUDA_VISIBLE_DEVICES"] = "{}".format(gpu_id)
    from keras_retinanet.models import convert_model
    from keras_retinanet.models import load_model
    model = load_model(model_path, backbone_name='resnet50')
    model = convert_model(model)
    return model


def predict_frames(video_capture, model, videoid, concepts, collections=None, local_con=None):
    currently_tracked_objects = []
    annotations = [
        pd.DataFrame(
            columns=[
                'x1', 'y1', 'x2', 'y2',
                'label', 'confidence', 'objectid', 'frame_num']
        )]

    max_tracked_frames = int(video_capture.get(
        cv2.CAP_PROP_FPS) * config.MAX_TIME_BACK)
    total_frames = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
    one_percent_length = int(total_frames / 100)
    frame_num = 0
    video_frames = []

    video_capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
    for frame_num in range(total_frames):
        check, frame = video_capture.read()
        if not check:
            break
        frame = cv2.resize(
            frame, (config.RESIZED_WIDTH, config.RESIZED_HEIGHT))
        video_frames = [frame] + video_frames[:max_tracked_frames]

        if frame_num % one_percent_length == 0:
            # update the progress every 1% of the video
            upload_predict_progress(
                frame_num, videoid, total_frames, 2, local_con=local_con)

        # update tracking for currently tracked objects
        for obj in currently_tracked_objects:
            success = obj.update(frame, frame_num)
            # Todo: Maybe remove overlapping tracking
            if not success or obj.tracked_frames > 30:
                annotations.append(obj.annotations)
                currently_tracked_objects.remove(obj)
                # Check if there is a matching prediction if the tracking fails?

        # Every NUM_FRAMES frames, get new predictions
        # Then, check if any detections match a currently tracked object
        if frame_num % config.NUM_FRAMES == 0:
            detections, rejections = get_predictions(frame, model, concepts, collections)
            detections['is_detection'] = True
            rejections['is_detection'] = False
            if len(detections) == 0:
                continue
            print(f'total detections: {len(detections)}')

            # Match new detections with currently tracked objects
            if len(currently_tracked_objects) != 0:
                final_detections = match_existing_tracked_object(
                    detections.append(rejections), currently_tracked_objects)
            else:
                final_detections = detections
                final_detections['match'] = False

            for _, detection in final_detections.iterrows():
                if detection.match:
                    currently_tracked_objects[detection.max_iou_index].reinit(detection, frame, frame_num)
                else:
                    tracked_object = Tracked_object(detection, frame, frame_num)
                    prev_annotations, matched_obj_id = track_backwards(
                        video_frames, frame_num, detection,
                        tracked_object.id, pd.concat(annotations), max_tracked_frames)
                    if matched_obj_id:
                        tracked_object.change_id(matched_obj_id)
                    tracked_object.annotations = tracked_object.annotations.append(
                        prev_annotations)
                    currently_tracked_objects.append(tracked_object)

    for obj in currently_tracked_objects:
        annotations.append(obj.annotations)

    results = pd.concat(annotations)
    return results


def _get_collection_confidence(confidences):  # 1 - (1-a)(1-b)...(1-z)
    complement = np.prod([1 - c for c in confidences])
    return 1 - complement

# Check if the proposals are pairwise overlapping


def _are_overlapping(adj_list, proposals):
    for proposal_a, proposal_b in itertools.combinations(proposals, 2):
        try:
            if proposal_b not in adj_list[proposal_a]:
                return False
        except KeyError:
            return False
    return True


def _get_ancestor(concepts_table, concept):
    return int(concepts_table[concepts_table['id'] == concept]['parent'].iloc[0])


def _find_nearest_common_ancestor_pair(c1, c2):
    concepts_table = pd_query("""SELECT * FROM concepts""")
    if c1 == c2:
        return c1
    visited = set((c1, c2))
    while c1 != 0 or c2 != 0:
        if c1 != 0:
            c1 = _get_ancestor(concepts_table, c1)
            if c1 in visited:
                return c1
            visited.add(c1)
        if c2 != 0:
            c2 = _get_ancestor(concepts_table, c2)
            if c2 in visited:
                return c2
            visited.add(c2)
    raise ValueError("Bug in find_nearest_common_ancestor")


def _find_nearest_common_ancestor(concepts):
    concepts = list(concepts)
    c1 = concepts.pop()

    for c2 in concepts:
        c1 = _find_nearest_common_ancestor_pair(c1, c2)
    return c1

# build a graph where vertices are proposals and there are edges between overlapping proposals of differing concepts


def _build_graph(label_groups):
    adj_list = dict()
    # filter out proposals that even combined with max of other groups don't exceed threshold
    group_maxima = label_groups.score.apply(max)
    for group_a, group_b in itertools.combinations(label_groups, 2):
        other_maxima = list(group_maxima.drop([group_a[0], group_b[0]]))
        for i, proposal_a in group_a[1].iterrows():
            # first = True
            # broken = False
            for j, proposal_b in group_b[1].iterrows():
                # if _get_collection_confidence([proposal_a['score'], proposal_b['score']] + other_maxima) < THRESHOLD:
                # broken = True
                # break
                iou = compute_IOU(proposal_a['box'], proposal_b['box'])
                if iou > config.EVALUATION_IOU_THRESH:
                    adj_list.setdefault(i, set()).add(j)
                    adj_list.setdefault(j, set()).add(i)
                # first = False
            # if first and broken:
                # break
    return adj_list


def _get_intersecting_box(boxes):
    x1 = max(box[0] for box in boxes)
    y1 = max(box[1] for box in boxes)
    x2 = min(box[2] for box in boxes)
    y2 = min(box[3] for box in boxes)
    return np.array((x1, y1, x2, y2))


def _find_collection_predictions(proposal_df, collection, label):
    # These are the ids for the proposals we will use for collections
    used_ids = []
    # filter the proposal_df and group it by label
    label_groups = proposal_df[proposal_df.label.isin(collection)].groupby('label')
    if len(label_groups) < 2:
        return [], []

    # filter out proposals not in adj_list
    adj_list = _build_graph(label_groups)
    label_groups = proposal_df[proposal_df.label.isin(
        collection) & proposal_df.index.isin(adj_list)].groupby('label')

    predictions = []

    for n in range(2, len(collection) + 1):
        # iterate over all possible subsets of size n of the collection
        for subgroups in itertools.combinations(label_groups, n):
            for proposals in itertools.product(*[sg[1].iterrows() for sg in subgroups]):
                confidence = _get_collection_confidence(
                    [p['score'] for _, p in proposals])
                if confidence > config.DEFAULT_PREDICTION_THRESHOLD and _are_overlapping(
                        adj_list, [v for v, _ in proposals]):
                    intersecting_box = _get_intersecting_box(
                        [p['box'] for _, p in proposals])
                    predictions.append((intersecting_box, confidence, label))
                    used_ids += [p['id'] for _, p in proposals]

    return predictions, used_ids


def get_predictions(frame, model, concepts, collections=None):
    # These are the ids for predictions
    used_ids = []
    frame = np.expand_dims(frame, axis=0)
    boxes, scores, labels = model.predict_on_batch(frame)

    # create dataframe to manipulate data easier
    proposal_df = pd.DataFrame({'box': list(boxes[0]), 'score': scores[0],
                                'label': labels[0]})
    proposal_df['id'] = proposal_df.index
    proposal_df = proposal_df[proposal_df['label'] != -1]
    proposal_df['label'] = proposal_df['label'].apply(lambda x: concepts[x])

    # confident_mask = proposal_df.apply(
    #     lambda x: x['score'] >= config.THRESHOLDS[x['label']], axis=1)
    confident_mask = (proposal_df['score'] >= config.DEFAULT_PREDICTION_THRESHOLD)
    base_concept_predictions = proposal_df[confident_mask]
    used_ids += list(base_concept_predictions.id)
    collection_candidates = proposal_df[~confident_mask]

    collection_predictions = []
    if collections:
        for dummy_concept_id, collection in collections.items():
            predictions, predictions_ids = _find_collection_predictions(
                collection_candidates, collection, dummy_concept_id)
            collection_predictions += predictions
            used_ids += predictions_ids

    if len(collection_predictions) != 0:
        print('collection prediction!!')
    base_concept_predictions = base_concept_predictions.drop(columns='id')
    proposals = base_concept_predictions.append(
        pd.DataFrame(collection_predictions, columns=base_concept_predictions.columns))
    rejections = proposal_df[~proposal_df.id.isin(used_ids)]
    rejections = rejections.drop(columns='id')
    return proposals, rejections


def match_existing_tracked_object(detection_df, currently_tracked_objects):
    # Make bounding box lists
    detection_bb_list = np.stack(detection_df.box.values, axis=0)
    tracked_obj_bb_list = np.array([obj.get_BB() for obj in currently_tracked_objects])

    # Calculate ious
    ious = computer_vectorized_IOU(detection_bb_list, tracked_obj_bb_list)
    detection_df['max_iou'] = np.max(ious, axis=1)
    detection_df['max_iou_index'] = np.argmax(ious, axis=1)

    # Filter valid detections
    new_detections = (detection_df.is_detection == True) & (detection_df.max_iou < config.TRACKING_IOU_THRESH)
    matching_detections = ~new_detections & detection_df.max_iou > .2
    final_detections = detection_df[new_detections].append(detection_df[matching_detections].sort_values(
        ['score', 'max_iou'], ascending=False).drop_duplicates('max_iou_index'))

    # Match is true if detection overlaps with an object
    final_detections['match'] = final_detections.max_iou > config.TRACKING_IOU_THRESH

    return final_detections


def computer_vectorized_IOU(list_bboxes1, list_bboxes2):
    x11, y11, x12, y12 = np.split(list_bboxes1, 4, axis=1)
    x21, y21, x22, y22 = np.split(list_bboxes2, 4, axis=1)

    xA = np.maximum(x11, np.transpose(x21))
    yA = np.maximum(y11, np.transpose(y21))
    xB = np.minimum(x12, np.transpose(x22))
    yB = np.minimum(y12, np.transpose(y22))
    interArea = np.maximum((xB - xA), 0) * np.maximum((yB - yA), 0)
    boxAArea = np.abs((x12 - x11) * (y12 - y11))
    boxBArea = np.abs((x22 - x21) * (y22 - y21))
    denominator = (boxAArea + np.transpose(boxBArea) - interArea)
    ious = np.where(denominator != 0, interArea / denominator, 0)
    return ious


def compute_IOU(boxA, boxB):
    # determine the (x, y)-coordinates of the intersection rectangle
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    # compute the area of intersection rectangle
    interArea = max((xB - xA, 0)) * max((yB - yA), 0)
    if interArea == 0:
        return 0
    # compute the area of both the prediction and ground-truth
    # rectangles
    boxAArea = abs((boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    boxBArea = abs((boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

    # compute the intersection over union by taking the intersection
    # area and dividing it by the sum of prediction + ground-truth
    # areas - the interesection area
    iou = interArea / float(boxAArea + boxBArea - interArea)

    # return the intersection over union value
    return iou


def compute_IOU_wrapper(boxA, boxB):
    return compute_IOU([boxA.x1, boxA.y1, boxA.x2, boxA.y2], [boxB.x1, boxB.y1, boxB.x2, boxB.y2])


# get tracking annotations before first model prediction for object - max_time_back seconds
# skipping original frame annotation, already saved in object initialization
def track_backwards(video_frames, frame_num, detection, object_id, old_annotations, max_frames):
    annotations = pd.DataFrame(
        columns=['x1', 'y1', 'x2', 'y2', 'label', 'confidence', 'objectid', 'frame_num'])
    (x1, y1, x2, y2) = detection.box
    box = (x1, y1, (x2 - x1), (y2 - y1))
    frame = video_frames[0]
    tracker = cv2.TrackerKCF_create()
    tracker.init(frame, box)
    success, box = tracker.update(frame)

    for frame in video_frames[1:max_frames]:
        frame_num -= 1
        success, box = tracker.update(frame)
        if not success:
            break
        annotation = make_annotation(box, object_id, frame_num)
        prev_frame_annotations = old_annotations[old_annotations['frame_num'] == frame_num]
        matched_obj_id = match_old_annotations(
            prev_frame_annotations, pd.Series(annotation))
        if matched_obj_id:
            annotations['objectid'] = matched_obj_id
            return annotations, matched_obj_id

        annotations = annotations.append(annotation, ignore_index=True)
    return annotations, None


def match_old_annotations(old_annotations, annotation):
    max_iou = 0
    match = None
    for _, annot in old_annotations.iterrows():
        iou = compute_IOU_wrapper(annot, annotation)
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
def propagate_conceptids(annotations):
    objects = annotations.groupby(['objectid'])
    for oid, group in objects:
        scores = {}
        for k, label in group.groupby(['label']):
            scores[k] = label.confidence.mean()  # Maybe the sum?
        idmax = max(scores.keys(), key=(lambda k: scores[k]))
        annotations.loc[annotations.objectid == oid, 'label'] = idmax
        annotations.loc[annotations.objectid ==
                        oid, 'confidence'] = scores[idmax]
    # need both label and conceptid for later
    annotations['conceptid'] = annotations['label']
    return annotations


# Limit results based on tracked object length (ex. > 30 frames)
def length_limit_objects(pred, frame_thresh):
    obj_len = pred.groupby('objectid').label.value_counts()
    len_thresh = obj_len[obj_len > frame_thresh]
    return pred[[(obj in len_thresh) for obj in pred.objectid]]


# Chooses single prediction for each object (the middle frame)s
def get_final_predictions(results):
    middle_frames = []
    for obj in [object_annotations for _, object_annotations in results.groupby('objectid')]:
        middle_frame = int(obj.frame_num.median())
        frame = obj[obj.frame_num == middle_frame]
        # Skip erroneous frames without data
        if frame.size == 0:
            continue
        middle_frames.append(frame.values.tolist()[0])
    middle_frames = pd.DataFrame(middle_frames)
    middle_frames.columns = results.columns
    return middle_frames


def handle_annotation(
        prediction, video_capture, videoid, videoheight, videowidth, userid, collection_id, cursor=None, s3=None):
    frame = get_frame(video_capture, prediction['frame_num'])
    annotation_id = upload_annotation(frame,
                                      *prediction.loc[['x1', 'x2', 'y1',
                                                       'y2', 'frame_num',
                                                       'label']],
                                      videoid, videowidth, videoheight, userid,
                                      video_capture.get(cv2.CAP_PROP_FPS), cursor=cursor, s3=s3)
    if collection_id is not None:
        cursor.execute(
            """
            INSERT INTO annotation_intermediate (id, annotationid)
            VALUES (%s, %s)
            """,
            (collection_id, annotation_id)
        )


def get_frame(video_capture, frame_num):
    video_capture.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
    check, frame = video_capture.read()
    if not check:
        print(f'failed to get frame {frame_num}', file=sys.stderr)
    return frame

# Uploads images and puts annotation in database


def upload_annotation(frame, x1, x2, y1, y2,
                      frame_num, conceptid, videoid, videowidth, videoheight, userid, fps, cursor=None, s3=None):
    if userid is None:
        raise ValueError("userid is None, can't upload annotations")

    timeinvideo = frame_num / fps
    no_box = str(videoid) + "_" + str(timeinvideo) + "_ai.png"
    temp_file = str(uuid.uuid4()) + ".png"
    cv2.imwrite(temp_file, frame)
    s3.upload_file(temp_file, config.S3_BUCKET, config.S3_ANNOTATION_FOLDER +
                   no_box, ExtraArgs={'ContentType': 'image/png'})
    os.system('rm ' + temp_file)
    cursor.execute(
        """
        INSERT INTO annotations (
        videoid, userid, conceptid, timeinvideo, x1, y1, x2, y2,
        videowidth, videoheight, dateannotated, image)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            int(videoid), int(userid), int(conceptid), timeinvideo, x1, y1,
            x2, y2, videowidth, videoheight, datetime.datetime.now().date(), no_box
        )
    )
    annotation_id = cursor.fetchone()[0]
    return annotation_id


def upload_predict_progress(count, videoid, total_count, status, local_con=None):
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
    # if (count == 0):
    #     local_con.cursor().execute('''
    #         UPDATE predict_progress
    #         SET framenum=%s, status=%s, totalframe=%s''',
    #                          (count, status, total_count,))
    #     local_con.commit()
    #     return

    # if (total_count == count):
    #     count = -1
    # local_con.cursor().execute('''
    #     UPDATE predict_progress
    #     SET framenum=%s''',
    #                      (count,)
    #                      )
    # local_con.commit()

import copy
import os
import uuid
import datetime
import psutil
import itertools

import cv2
import numpy as np
import pandas as pd
from keras_retinanet.models import convert_model
from keras_retinanet.models import load_model
import subprocess

from config import config
from utils.query import s3, cursor, pd_query, con
from ffmpy import FFmpeg
from memory_profiler import profile

fp = open('memory_profiler.log', 'w+')


def get_classmap(concepts):
    classmap = []
    for concept in concepts:
        name = pd_query("select name from concepts where id=%s",
                        (str(concept),)).iloc[0]["name"]
        classmap.append([name, concepts.index(concept)])
    classmap = pd.DataFrame(classmap)
    classmap = classmap.to_dict()[0]
    return classmap


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


def resize(row):
    new_width = config.RESIZED_WIDTH
    new_height = config.RESIZED_HEIGHT
    row.x1 = (row.x1 * new_width) / row.videowidth
    row.x2 = (row.x2 * new_width) / row.videowidth
    row.y1 = (row.y1 * new_height) / row.videoheight
    row.y2 = (row.y2 * new_height) / row.videoheight
    row.videowidth = new_width
    row.videoheight = new_height
    return row


@profile(stream=fp)
def predict_on_video(videoid, model_weights, concepts, filename,
                     upload_annotations=False, userid=None, collection_id=None,
                     collections=None):
    vid_filename = pd_query(f'''
            SELECT *
            FROM videos
            WHERE id ={videoid}''').iloc[0].filename
    print("Loading Video.")
    frames, fps = get_video_frames(vid_filename, videoid)

    # Get biologist annotations for video

    printing_with_time("Before database query")
    tuple_concept = ''
    if len(concepts) == 1:
        tuple_concept = f''' = {str(concepts)}'''
    else:
        tuple_concept = f''' in {str(tuple(concepts))}'''

    print(concepts)
    annotations = pd_query(
        f'''
        SELECT
          x1, y1, x2, y2,
          conceptid as label,
          null as confidence,
          null as objectid,
          videowidth, videoheight,
          CASE WHEN
            framenum is not null
          THEN
            framenum
          ELSE
            FLOOR(timeinvideo*{fps})
          END AS frame_num
        FROM
          annotations
        WHERE
          videoid={videoid} AND
          userid in {str(tuple(config.GOOD_USERS))} AND
          conceptid {tuple_concept}''')

    print(f'Number of human annotations {len(annotations)}')
    printing_with_time("After database query")

    printing_with_time("Resizing annotations.")
    annotations = annotations.apply(resize, axis=1)
    annotations = annotations.drop(['videowidth', 'videoheight'], axis=1)
    frame_limit = len(frames)
    printing_with_time("Done resizing annotations.")

    print("Initializing Model")
    model = init_model(model_weights)

    printing_with_time("Predicting")
    results, frames = predict_frames(
        frames, fps, model, videoid, concepts, collections)
    if (results.empty):
        print("no predictions")
        return results, annotations
    results = propagate_conceptids(results)
    results = length_limit_objects(results, config.MIN_FRAMES_THRESH)
    print(f'Number of model annotations {len(results)}')
    if upload_annotations:
        printing_with_time("Uploading annotations")
        # filter results down to middle frames
        mid_frame_results = get_final_predictions(results)
        # upload these annotations
        mid_frame_results.apply(
            lambda prediction: handle_annotation(prediction, frames, videoid,
                                                 config.RESIZED_HEIGHT,
                                                 config.RESIZED_WIDTH, userid,
                                                 fps, collection_id), axis=1)
        con.commit()

    printing_with_time("Generating Video")
    generate_video(
        filename, frames,
        fps, results, concepts + list(collections.keys()), videoid, annotations)

    printing_with_time("Done generating")
    return results, annotations


@profile(stream=fp)
def get_video_frames(vid_filename, videoid):
    frames = []
    # grab video stream
    url = s3.generate_presigned_url('get_object',
                                    Params={'Bucket': config.S3_BUCKET,
                                            'Key': config.S3_VIDEO_FOLDER + vid_filename},
                                    ExpiresIn=3600)
    vid = cv2.VideoCapture(url)
    fps = vid.get(cv2.CAP_PROP_FPS)
    length = int(vid.get(cv2.CAP_PROP_FRAME_COUNT))
    while not vid.isOpened():
        continue
    print("Successfully opened video.")
    check = True
    frame_counter = 0
    one_percent_length = int(length / 100)
    while True:
        if frame_counter % one_percent_length == 0:
            upload_predict_progress(frame_counter, videoid, length, 1)

        check, frame = vid.read()
        if not check:
            break
        frame = cv2.resize(
            frame, (config.RESIZED_WIDTH, config.RESIZED_HEIGHT))
        frames.append(frame)
        frame_counter += 1
    vid.release()
    print("Done resizing video.")
    return frames, fps


def init_model(model_path):
    model = load_model(model_path, backbone_name='resnet50')
    model = convert_model(model)
    return model


def predict_frames(video_frames, fps, model, videoid, concepts, collections=None):
    currently_tracked_objects = []
    annotations = [
        pd.DataFrame(
            columns=[
                'x1', 'y1', 'x2', 'y2',
                'label', 'confidence', 'objectid', 'frame_num']
        )]
    total_frames = len(video_frames)
    one_percent_length = int(total_frames / 100)
    for frame_num, frame in enumerate(video_frames):
        if frame_num % one_percent_length == 0:
            # update the progress every 1% of the video
            upload_predict_progress(frame_num, videoid, total_frames, 2)

        # update tracking for currently tracked objects
        for obj in currently_tracked_objects:
            success = obj.update(frame, frame_num)
            # temp = list(currently_tracked_objects)
            # temp.remove(obj)
            # detection = (obj.box, 0, 0)
            # match, matched_object = does_match_existing_tracked_object(
            #     detection[0], temp)
            if not success or obj.tracked_frames > 30:
                annotations.append(obj.annotations)
                currently_tracked_objects.remove(obj)
                # Check if there is a matching prediction if the tracking fails?

        # Every NUM_FRAMES frames, get new predictions
        # Then, check if any detections match a currently tracked object
        if frame_num % config.NUM_FRAMES == 0:
            detections = get_predictions(frame, model, concepts, collections)
            print(f'total detections: {len(detections)}')
            for _, detection in detections.iterrows():
                (x1, y1, x2, y2) = detection.box
                if (x1 > x2 or y1 > y2):
                    continue
                match, matched_object = does_match_existing_tracked_object(
                    detection.box, currently_tracked_objects)
                if match:
                    matched_object.reinit(detection, frame, frame_num)
                else:
                    tracked_object = Tracked_object(
                        detection, frame, frame_num)
                    prev_annotations, matched_obj_id = track_backwards(
                        video_frames, frame_num, detection,
                        tracked_object.id, fps, pd.concat(annotations))
                    if matched_obj_id:
                        tracked_object.change_id(matched_obj_id)
                    tracked_object.annotations = tracked_object.annotations.append(
                        prev_annotations)
                    currently_tracked_objects.append(tracked_object)

    for obj in currently_tracked_objects:
        annotations.append(obj.annotations)

    results = pd.concat(annotations)
    return results, video_frames


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


def _find_collection_predictions(df, collection, label):
    # filter the df and group it by label
    label_groups = df[df.label.isin(collection)].groupby('label')
    if len(label_groups) < 2:
        return []

    # filter out proposals not in adj_list
    adj_list = _build_graph(label_groups)
    label_groups = df[df.label.isin(
        collection) & df.index.isin(adj_list)].groupby('label')

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

    return predictions


def get_predictions(frame, model, concepts, collections=None):
    frame = np.expand_dims(frame, axis=0)
    boxes, scores, labels = model.predict_on_batch(frame)

    # create dataframe to manipulate data easier
    df = pd.DataFrame({'box': list(boxes[0]), 'score': scores[0],
                       'label': labels[0]})
    df = df[df['label'] != -1]
    df['label'] = df['label'].apply(lambda x: concepts[x])

    # confident_mask = df.apply(
    #     lambda x: x['score'] >= config.THRESHOLDS[x['label']], axis=1)
    confident_mask = (df['score'] >= config.DEFAULT_PREDICTION_THRESHOLD)
    base_concept_predictions = df[confident_mask]
    collection_candidates = df[~confident_mask]

    collection_predictions = []
    if collections:
        for dummy_concept_id, collection in collections.items():
            collection_predictions += _find_collection_predictions(
                collection_candidates, collection, dummy_concept_id)
    if len(collection_predictions) != 0:
        print('collection prediction!!')
    return base_concept_predictions.append(
        pd.DataFrame(collection_predictions, columns=df.columns))


def does_match_existing_tracked_object(detection, currently_tracked_objects):
    (x1, y1, x2, y2) = detection
    detection_series = pd.Series({'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2})
    # Compute IOU with each currently tracked object
    max_iou = 0
    match = None
    for obj in currently_tracked_objects:
        iou = compute_IOU_wrapper(obj, detection_series)
        if (iou > max_iou):
            max_iou = iou
            match = obj
    return (max_iou >= config.TRACKING_IOU_THRESH), match


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
def track_backwards(video_frames, frame_num, detection, object_id, fps, old_annotations):
    annotations = pd.DataFrame(
        columns=['x1', 'y1', 'x2', 'y2', 'label', 'confidence', 'objectid', 'frame_num'])
    (x1, y1, x2, y2) = detection.box
    box = (x1, y1, (x2 - x1), (y2 - y1))
    frame = video_frames[frame_num]
    tracker = cv2.TrackerKCF_create()
    tracker.init(frame, box)
    success, box = tracker.update(frame)
    frames = 0
    max_frames = fps * config.MAX_TIME_BACK
    while success and frames < max_frames and frame_num > 0:
        frame_num -= 1
        frame = video_frames[frame_num]
        success, box = tracker.update(frame)
        if success:
            annotation = make_annotation(box, object_id, frame_num)
            prev_frame_annotations = old_annotations[old_annotations['frame_num'] == frame_num]
            matched_obj_id = match_old_annotations(
                prev_frame_annotations, pd.Series(annotation))
            if matched_obj_id:
                annotations['objectid'] = matched_obj_id
                return annotations, matched_obj_id

            annotations = annotations.append(annotation, ignore_index=True)
        frames += 1
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

# Generates the video with the ground truth frames interlaced


@profile(stream=fp)
def generate_video(filename, frames, fps, results, concepts, video_id,
                   annotations):

    # Combine human and prediction annotations
    results = results.append(annotations, sort=True)
    # Cast frame_num to int (prevent indexing errors)
    results.frame_num = results.frame_num.astype('int')
    classmap = get_classmap(concepts)

    # make a dictionary mapping conceptid to count (init 0)
    conceptsCounts = {concept: 0 for concept in concepts}
    total_length = len(results)
    one_percent_length = int(total_length / 100)
    seenObjects = []
    for pred_index, res in enumerate(results.itertuples()):
        if pred_index % one_percent_length == 0:
            upload_predict_progress(pred_index, video_id, total_length, 3)

        x1, y1, x2, y2 = int(res.x1), int(res.y1), int(res.x2), int(res.y2)
        # boxText init to concept name
        boxText = classmap[concepts.index(res.label)]

        if pd.isna(res.confidence):  # No confidence means user annotation
            # Draws a (user) red box
            # Note: opencv uses color as BGR
            cv2.rectangle(frames[res.frame_num], (x1, y1),
                          (x2, y2), (0, 0, 255), 2)
        else:  # if confidence exists -> AI annotation
            # Keeps count of concepts
            if (res.objectid not in seenObjects):
                conceptsCounts[res.label] += 1
                seenObjects.append(res.objectid)
            # Draw an (AI) green box
            cv2.rectangle(frames[res.frame_num], (x1, y1),
                          (x2, y2), (0, 255, 0), 2)
            # boxText = count concept-name (confidence) e.g. "1 Starfish (0.5)"
            boxText = str(conceptsCounts[res.label]) + " " + boxText + \
                " (" + str(round(res.confidence, 3)) + ")"
        cv2.putText(
            frames[res.frame_num], boxText,
            (x1 - 5, y2 + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    save_video(filename, frames, fps)


@profile(stream=fp)
def save_video(filename, frames, fps):
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, fps, frames[0].shape[::-1][1:3])
    for frame in frames:
        out.write(frame)
    out.release()

    # convert to mp4 and upload to s3 and db
    # requires temp so original not overwritten
    converted_file = 'temp.mp4'
    # Convert file so we can stream on s3
    ff = FFmpeg(
        inputs={filename: ['-loglevel', '0']},
        outputs={converted_file: ['-codec:v', 'libx264', '-y']}
    )
    print(ff.cmd)
    print(psutil.virtual_memory())
    ff.run()

    # temp = ['ffmpeg', '-loglevel', '0', '-i', filename,
    #         '-codec:v', 'libx264', '-y', converted_file]
    # subprocess.call(temp)
    # upload video..
    s3.upload_file(
        converted_file, config.S3_BUCKET,
        config.S3_BUCKET_AIVIDEOS_FOLDER + filename,
        ExtraArgs={'ContentType': 'video/mp4'})
    # remove files once uploaded
    os.system('rm \'' + filename + '\'')
    os.system('rm ' + converted_file)

    cv2.destroyAllWindows()

# Chooses single prediction for each object (the middle frame)


def get_final_predictions(results):
    middle_frames = []
    for obj in [df for _, df in results.groupby('objectid')]:
        middle_frame = int(obj.frame_num.median())
        frame = obj[obj.frame_num == middle_frame]
        # Skip erroneous frames without data
        if frame.size == 0:
            continue
        middle_frames.append(frame.values.tolist()[0])
    middle_frames = pd.DataFrame(middle_frames)
    middle_frames.columns = results.columns
    return middle_frames


def handle_annotation(prediction, frames, videoid, videoheight, videowidth, userid, fps, collection_id):
    frame = frames[int(prediction.frame_num)]
    annotation_id = upload_annotation(frame,
                                      *prediction.loc[['x1', 'x2', 'y1',
                                                       'y2', 'frame_num',
                                                       'label']],
                                      videoid, videowidth, videoheight, userid,
                                      fps)
    if collection_id is not None:
        cursor.execute(
            """
            INSERT INTO annotation_intermediate (id, annotationid)
            VALUES (%s, %s)
            """,
            (collection_id, annotation_id)
        )
    # con.commit()


# Uploads images and puts annotation in database
def upload_annotation(frame, x1, x2, y1, y2,
                      frame_num, conceptid, videoid, videowidth, videoheight, userid, fps):
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


def upload_predict_progress(count, videoid, total_count, status):
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
    if (count == 0):
        cursor.execute('''
            UPDATE predict_progress
            SET framenum=%s, status=%s, totalframe=%s''',
                       (count, status, total_count,))
        con.commit()
        return

    if (total_count == count):
        count = -1
    cursor.execute('''
        UPDATE predict_progress
        SET framenum=%s''',
                   (count,)
                   )
    con.commit()


if __name__ == '__main__':

    model_name = 'testV2'

    s3.download_file(config.S3_BUCKET, config.S3_WEIGHTS_FOLDER +
                     model_name + '.h5', config.WEIGHTS_PATH)
    cursor.execute("SELECT * FROM MODELS WHERE name='" + model_name + "'")
    model = cursor.fetchone()

    videoid = 86
    concepts = model[2]

    predict_on_video(videoid, config.WEIGHTS_PATH, concepts)

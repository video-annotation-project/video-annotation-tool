import os
import json
import uuid
import datetime
import copy
import time
import psutil

import pandas as pd
import numpy as np
import boto3
from psycopg2 import connect
import cv2
from ffmpy import FFmpeg

from predict import predict
from config import config
from utils.query import pd_query, get_db_connection, get_s3_connection


def get_classmap(concepts, local_con=None):
    classmap = []
    for concept in concepts:
        name = pd_query("select name from concepts where id=%s",
                        (str(concept),), local_con=local_con).iloc[0]["name"]
        classmap.append([name, concepts.index(concept)])
    classmap = pd.DataFrame(classmap)
    classmap = classmap.to_dict()[0]
    return classmap


def printing_with_time(text):
    print(text + " " + str(datetime.datetime.now()))


def vectorized_iou(list_bboxes1, list_bboxes2):
    x11, y11, x12, y12 = np.split(list_bboxes1, 4, axis=1)
    x21, y21, x22, y22 = np.split(list_bboxes2, 4, axis=1)

    xA = np.maximum(x11, x21)
    yA = np.maximum(y11, y21)
    xB = np.minimum(x12, x22)
    yB = np.minimum(y12, y22)
    interArea = np.maximum((xB - xA), 0) * np.maximum((yB - yA), 0)
    boxAArea = np.abs((x12 - x11) * (y12 - y11))
    boxBArea = np.abs((x22 - x21) * (y22 - y21))
    denominator = (boxAArea + boxBArea - interArea)
    ious = np.where(denominator != 0, interArea / denominator, 0)
    return [iou[0] for iou in ious]


# These are the new functions for FP
def convert_hierarchy_fp_counts(value_counts, collections):
    # normal counts is a count_values type object
    # It ignores hierarchy counts
    normal_counts = copy.deepcopy(value_counts)
    for collectionid, count in value_counts[value_counts.index < 0].iteritems():
        del value_counts[collectionid]
        del normal_counts[collectionid]
        collection_conceptids = collections[collectionid]
        for conceptid in collection_conceptids:
            value_counts[conceptid] += count / len(collection_conceptids)
    return value_counts, normal_counts


# New function for convering hierarchy TP
def convert_hierarchy_tp_counts(pred_val_label_counts, HFP, collections, concepts):
    TP = dict(zip(concepts, [0.0] * len(concepts)))
    HTP = dict(zip(concepts, [0.0] * len(concepts)))
    for _, row in pred_val_label_counts.reset_index().iterrows():
        user_label = row.label_val  # Adding TP to this
        # If this is negative, add to TP 1/len(collection) and add to FP 1/len(collection)
        model_label = row.label_pred
        count = row.iou  # This how many of this label model annotations overlap with this label human annotation
        if model_label < 0:
            HTP[user_label] += count / len(collections[model_label])
            for conceptid in collections[model_label]:
                if conceptid == user_label:
                    continue
                HFP[conceptid] += count / len(collections[model_label])
        else:
            HTP[user_label] += count
            TP[user_label] += count
    return pd.Series(HTP), pd.Series(HFP), pd.Series(TP)


def get_count(count_values, concept):
    return count_values[concept] if concept in count_values.index else 0


def get_precision(TP, FP):
    return TP / (TP + FP) if (TP + FP) != 0 else 0


def get_recall(TP, FN):
    return TP / (TP + FN) if (TP + FN) != 0 else 0


def get_f1(recall, precision):
    return (2 * recall * precision / (precision + recall)) if (precision + recall) != 0 else 0


def count_accuracy(true_num, pred_num):
    if true_num == 0:
        return 1.0 if pred_num == 0 else 0
    else:
        return 1 - (abs(true_num - pred_num) / max(true_num, pred_num))


def get_recall_precision_f1_counts(TP, FP, FN):
    pred_num, true_num = TP+FP, TP+FN
    r, p = get_recall(TP, FN), get_precision(TP, FP)
    return r, p, get_f1(r, p), pred_num, true_num, count_accuracy(true_num, pred_num)


def generate_metrics(concepts, list_of_classifications):
    metrics = pd.DataFrame()
    for concept in concepts:
        HTP, HFP, HFN, TP, FP, FN = [
            get_count(classification, concept) for classification in list_of_classifications]

        metrics = metrics.append([
            [
                concept,
                HTP, HFP, HFN, *get_recall_precision_f1_counts(HTP, HFP, HFN),
                TP, FP, FN, *get_recall_precision_f1_counts(TP, FP, FN)
            ]
        ])
    metrics.columns = [
        "conceptid",
        "H_TP", "H_FP", "H_FN", "H_Precision", "H_Recall", "H_F1", "H_pred_num", "H_true_num", "H_count_accuracy",
        "TP", "FP", "FN", "Precision", "Recall", "F1", "pred_num", "true_num", "count_accuracy"]
    return metrics


def score_predictions(validation, predictions, iou_thresh, concepts, collections):
    validation['id'] = validation.index
    cords = ['x1', 'y1', 'x2', 'y2']
    val_suffix = '_val'
    pred_suffix = '_pred'

    # Set the index to frame_num for merge on prediction
    merged_user_pred_annotations = validation.set_index('frame_num').join(predictions.set_index(
        'frame_num'), lsuffix=val_suffix, rsuffix=pred_suffix, sort=True).reset_index()
    # Only keep rows which the predicted label matching validation (or collection)
    merged_user_pred_annotations = merged_user_pred_annotations[
        merged_user_pred_annotations.apply(
            lambda row:
            True if
            row.label_val == row.label_pred
            or (row.label_pred < 0 and row.label_val in collections[row.label_pred])
            else False, axis=1)]

    # get data from validation x_val...
    merged_val_x_y = merged_user_pred_annotations[[
        cord+val_suffix for cord in cords]].to_numpy()
    # get data for pred data x_pred...
    merged_pred_x_y = merged_user_pred_annotations[[
        cord+pred_suffix for cord in cords]].to_numpy()

    # Get iou for each row
    iou = vectorized_iou(merged_val_x_y, merged_pred_x_y)
    merged_user_pred_annotations = merged_user_pred_annotations.assign(iou=iou)

    # Correctly Classified must have iou greater than or equal to threshold
    correctly_classified_objects = merged_user_pred_annotations[
        merged_user_pred_annotations.iou >= iou_thresh]
    correctly_classified_objects = correctly_classified_objects.drop_duplicates(
        subset='objectid_pred')

    # False Positive
    pred_objects_no_val = predictions[~predictions.objectid.isin(
        correctly_classified_objects.objectid_pred)].drop_duplicates(subset='objectid')
    HFP = pred_objects_no_val['label'].value_counts()
    HFP, FP = convert_hierarchy_fp_counts(HFP, collections)

    # True Positive
    pred_val_label_counts = correctly_classified_objects.sort_values(
        by=['label_pred', 'iou'], ascending=False).drop_duplicates(subset='id').groupby(["label_pred", "label_val"])["iou"].count()
    HTP, HFP, TP = convert_hierarchy_tp_counts(
        pred_val_label_counts, HFP, collections, concepts)

    # False Negative
    HFN = validation[~validation.id.isin(
        correctly_classified_objects.id)].label.value_counts()
    FN = validation[~validation.id.isin(
        correctly_classified_objects[correctly_classified_objects.label_pred > 0].id)].label.value_counts()

    return generate_metrics(concepts, [HTP, HFP, HFN, TP, FP, FN])


def update_ai_videos_database(model_username, video_id, filename, local_con=None):
    # Get the model's name
    username_split = model_username.split('-')
    version = username_split[-1]
    model_name = '-'.join(username_split[:-1])

    # add the entry to ai_videos
    cursor = local_con.cursor()
    cursor.execute('''
            INSERT INTO ai_videos (name, videoid, version, model_name)
            VALUES (%s, %s, %s, %s)''',
                   (filename, video_id, version, model_name)
                   )
    local_con.commit()


def upload_metrics(metrics, filename, video_id, s3=None):
    metrics.to_csv("metrics" + str(video_id) + ".csv")
    # upload the data to s3 bucket
    print("uploading to s3 folder")
    s3.upload_file(
        "metrics" + str(video_id) + ".csv",
        config.S3_BUCKET,
        config.S3_METRICS_FOLDER + filename.replace("mp4", "csv"),
        ExtraArgs={"ContentType": "application/vnd.ms-excel"},
    )
    print(metrics)


def get_video_capture(vid_filename, s3=None):
    vid_filepath = os.path.join(config.VIDEO_FOLDER, vid_filename)
    if not os.path.exists(vid_filepath):
        s3.download_file(
            config.S3_BUCKET,
            config.S3_VIDEO_FOLDER + vid_filename,
            vid_filepath,
        )

    vid = cv2.VideoCapture(vid_filepath)
    while not vid.isOpened():
        time.sleep(1)
    print("Successfully opened video.")
    return vid


def save_video(filename, s3=None):
    # convert to mp4 and upload to s3 and db
    # requires temp so original not overwritten
    converted_file = str(uuid.uuid4()) + ".mp4"
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

# Generates the video with the ground truth frames interlaced


def generate_video(filename, video_capture, results, concepts, video_id,
                   annotations, local_con=None, s3=None):

    print("Inside generating video")
    # Combine human and prediction annotations
    results = results.append(annotations, sort=True)
    # Cast frame_num to int (prevent indexing errors)
    results.frame_num = results.frame_num.astype('int')
    classmap = get_classmap(concepts, local_con)

    # make a dictionary mapping conceptid to count (init 0)
    conceptsCounts = {concept: 0 for concept in concepts}
    total_length = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
    one_percent_length = int(total_length / 100)
    seenObjects = {}

    print("Opening video writer")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, video_capture.get(cv2.CAP_PROP_FPS),
                          (config.RESIZED_WIDTH, config.RESIZED_HEIGHT))
    print("Opened video writer")

    video_capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
    for frame_num in range(total_length):
        check, frame = video_capture.read()
        if not check:
            break

        if frame_num % one_percent_length == 0:
            predict.upload_predict_progress(
                frame_num, video_id, total_length, 3, local_con=local_con)

        for res in results[results.frame_num == frame_num].itertuples():
            x1, y1, x2, y2 = int(res.x1), int(res.y1), int(res.x2), int(res.y2)
            # boxText init to concept name
            boxText = classmap[concepts.index(res.label)]

            if pd.isna(res.confidence):  # No confidence means user annotation
                # Draws a (user) red box
                # Note: opencv uses color as BGR
                cv2.rectangle(frame, (x1, y1),
                              (x2, y2), (0, 0, 255), 2)
            else:  # if confidence exists -> AI annotation
                # Keeps count of concepts
                if (res.objectid not in seenObjects):
                    conceptsCounts[res.label] += 1
                    seenObjects[res.objectid] = conceptsCounts[res.label]
                # Draw an (AI) green box
                cv2.rectangle(frame, (x1, y1),
                              (x2, y2), (0, 255, 0), 2)
                # boxText = count concept-name (confidence) e.g. "1 Starfish (0.5)"
                boxText = str(seenObjects[res.objectid]) + " " + boxText + \
                    " (" + str(round(res.confidence, 3)) + ")"
            cv2.putText(
                frame, boxText,
                (x1 - 5, y2 + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        out.write(frame)

    out.release()

    save_video(filename, s3=s3)


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


def evaluate(video_id, model_username, concepts, upload_annotations=False,
             user_id=None, create_collection=False, collections=None, gpu_id=None):
    local_con = get_db_connection()
    s3 = get_s3_connection()

    collection_id = create_annotation_collection(
        model_username, user_id, video_id, concepts, upload_annotations, local_con=local_con) if create_collection else None

    # filename format: (video_id)_(model_name)-(version).mp4
    # This the generated video's filename
    filename = str(video_id) + "_" + model_username + ".mp4"
    print("ai video filename: {0}".format(filename))

    vid_filename = pd_query(f'''
            SELECT *
            FROM videos
            WHERE id ={video_id}''', local_con=local_con).iloc[0].filename
    print("Loading Video.")
    video_capture = get_video_capture(vid_filename, s3=s3)

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
            FLOOR(timeinvideo*{video_capture.get(cv2.CAP_PROP_FPS)})
          END AS frame_num
        FROM
          annotations
        WHERE
          videoid={video_id} AND
          userid in {str(tuple(config.GOOD_USERS))} AND
          conceptid {tuple_concept}''', local_con=local_con)
    print(f'Number of human annotations {len(annotations)}')
    printing_with_time("After database query")

    printing_with_time("Resizing annotations.")
    annotations = annotations.apply(resize, axis=1)
    annotations = annotations.drop(['videowidth', 'videoheight'], axis=1)
    printing_with_time("Done resizing annotations.")

    results = predict.predict_on_video(
        video_id, config.WEIGHTS_PATH, concepts, filename, video_capture, upload_annotations,
        user_id, collection_id, collections, local_con=local_con, s3=s3, gpu_id=gpu_id)
    if (results.empty):  # If the model predicts nothing stop here
        return
    print("done predicting")

    # This scores our well our model preformed against user annotations
    metrics = score_predictions(
        annotations, results, config.EVALUATION_IOU_THRESH, concepts, collections
    )

    # Upload metrics to s3 bucket
    upload_metrics(metrics, filename, video_id, s3=s3)

    # Generate video
    printing_with_time("Generating Video")
    generate_video(
        filename, video_capture,
        results, list(concepts) + list(collections.keys()), video_id, annotations, local_con=local_con, s3=s3)
    printing_with_time("Done generating")

    # Send the new generated video to our database
    update_ai_videos_database(model_username, video_id,
                              filename, local_con=local_con)

    local_con.close()


def create_annotation_collection(model_name, user_id, video_id, concept_ids, upload_annotations, local_con=None):
    if not upload_annotations:
        raise ValueError("cannot create new annotation collection if "
                         "annotations aren't uploaded")
    if user_id is None:
        raise ValueError("user_id is None, cannot create new collection")

    time_now = datetime.datetime.now().strftime(r"%y-%m-%d_%H:%M:%S")
    collection_name = '_'.join([model_name, str(video_id), time_now])
    description = f"By {model_name} on video {video_id} at {time_now}"

    concept_names = pd_query(
        """
        SELECT name
        FROM concepts
        WHERE id IN %s
        """, params=(tuple(concept_ids),), local_con=local_con
    )['name'].tolist()

    cursor = local_con.cursor()
    cursor.execute(
        """
        INSERT INTO annotation_collection
        (name, description, users, videos, concepts, tracking, conceptid)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (collection_name, description, [user_id], [video_id], concept_names,
         False, concept_ids)
    )
    local_con.commit()
    collection_id = int(cursor.fetchone()[0])

    return collection_id

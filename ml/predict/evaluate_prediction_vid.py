import os
import json
import datetime

import pandas as pd
import boto3
from psycopg2 import connect

from predict import predict
from config import config
from utils.query import cursor, s3, con, pd_query


def score_predictions(validation, predictions, iou_thresh, concepts):
    # Maintain a set of predicted objects to verify
    detected_objects = []
    obj_map = predictions.groupby("objectid", sort=False).label.max()

    # group predictions by video frames
    predictions = predictions.groupby("frame_num", sort=False)
    predictions = [df for _, df in predictions]

    # mapping frames to predictions index
    frame_data = {}
    for i, group in enumerate(predictions):
        frame_num = group.iloc[0]["frame_num"]
        frame_data[frame_num] = i

    # group validation annotations by frames
    validation = validation.groupby("frame_num", sort=False)
    validation = [df for _, df in validation]

    # initialize counters for each concept
    true_positives = dict(zip(concepts, [0] * len(concepts)))
    false_positives = dict(zip(concepts, [0] * len(concepts)))
    false_negatives = dict(zip(concepts, [0] * len(concepts)))

    # get true and false positives for each frame of validation data
    for group in validation:
        try:  # get corresponding predictions for this frame
            frame_num = group.iloc[0]["frame_num"]
            predicted = predictions[frame_data[frame_num]]
        except:
            continue  # False Negatives already covered

        detected_truths = dict(zip(concepts, [0] * len(concepts)))
        for index, truth in group.iterrows():
            for index, prediction in predicted.iterrows():
                if (
                    prediction.label == truth.label
                    and predict.compute_IOU(truth, prediction) > iou_thresh
                    and prediction.objectid not in detected_objects
                ):

                    detected_objects.append(prediction.objectid)
                    true_positives[prediction.label] += 1
                    detected_truths[prediction.label] += 1

        # False Negatives (Missed ground truth predicitions)
        counts = group.label.value_counts()
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
        f1 = (
            (2 * recall * precision / (precision + recall))
            if (precision + recall) != 0
            else 0
        )
        metrics = metrics.append(
            [[concept, TP, FP, FN, precision, recall, f1]])
    metrics.columns = ["conceptid", "TP", "FP",
                       "FN", "Precision", "Recall", "F1"]
    return metrics


def count_accuracy(row):
    if row.true_num == 0:
        return 1.0 if row.pred_num == 0 else 0
    else:
        return 1 - (abs(row.true_num - row.pred_num) / max(row.true_num, row.pred_num))


def get_counts(results, annotations):
    grouped = results.groupby(["objectid"]).label.mean().reset_index()
    counts = grouped.groupby("label").count()
    counts.columns = ["pred_num"]
    groundtruth_counts = pd.DataFrame(annotations.groupby("label").size())
    groundtruth_counts.columns = ["true_num"]
    counts = pd.concat((counts, groundtruth_counts),
                       axis=1, join="outer").fillna(0)
    counts["count_accuracy"] = counts.apply(count_accuracy, axis=1)
    return counts


def evaluate(video_id, model_username, concepts, upload_annotations=False,
             userid=None, create_collection=False):
    # file format: (video_id)_(model_name)-(version).mp4

    if create_collection:
        if not upload_annotations:
            raise ValueError("cannot create new annotation collection if "
                             "annotations aren't uploaded")
        if userid is None:
            raise ValueError("userid is None, cannot create new collection")
        collection_id = create_annotation_collection(model_username, userid, video_id, concepts)
    else:
        collection_id = None

    filename = str(video_id) + "_" + model_username + ".mp4"
    print("ai video filename: {0}".format(filename))
    results, annotations = predict.predict_on_video(
        video_id, config.WEIGHTS_PATH, concepts, filename, upload_annotations,
        userid, collection_id)
    if (results.empty):
        return
    username_split = model_username.split('-')
    version = username_split[-1]
    model_name = '-'.join(username_split[:-1])
    # add the entry to ai_videos
    cursor.execute('''
        INSERT INTO ai_videos (name, videoid, version, model_name)
        VALUES (%s, %s, %s, %s)''',
                   (filename, video_id, version, model_name)
                   )

    con.commit()
    print("done predicting")

    metrics = score_predictions(
        annotations, results, config.EVALUATION_IOU_THRESH, concepts
    )
    concept_counts = get_counts(results, annotations)
    metrics = metrics.set_index("conceptid").join(concept_counts)
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
    con.commit()


def create_annotation_collection(model_name, user_id, video_id, concept_ids):
    time_now = datetime.datetime.now().strftime(r"%y-%m-%d_%H:%M:%S")
    collection_name = '_'.join([model_name, str(video_id), time_now])
    description = f"By {model_name} on video {video_id} at {time_now}"
    concept_names = pd_query(
        """
        SELECT name
        FROM concepts
        WHERE id IN %s
        """, (tuple(concept_ids),)
        )['name'].tolist()

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
    con.commit()
    collection_id = int(cursor.fetchone()[0])

    return collection_id


if __name__ == "__main__":
    cursor.execute(
        """
        SELECT * FROM models
        LEFT JOIN users u ON u.id=userid
        WHERE name=%s
        """,
        ("testv3",),
    )
    model = cursor.fetchone()

    video_id = 86
    concepts = model[2]
    userid = "270"
    model_username = "testV2_KLSKLS"

    cursor.execute("""DELETE FROM predict_progress""")
    con.commit()
    cursor.execute(
        """
        INSERT INTO predict_progress (videoid, current_video, total_videos)
        VALUES (%s, %s, %s)""",
        (0, 0, 1),
    )
    con.commit()
    cursor.execute(
        """UPDATE predict_progress SET videoid = 86, current_video = current_video + 1"""
    )
    con.commit()

    evaluate(video_id, model_username, concepts)
    cursor.execute('''
        DELETE FROM predict_progress
        ''')

    con.commit()

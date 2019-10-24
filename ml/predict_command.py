from psycopg2 import connect
import subprocess
from dotenv import load_dotenv
from predict.evaluate_prediction_vid import evaluate
import boto3
import json
from utils.query import s3, con, cursor
from config.config import S3_BUCKET, S3_WEIGHTS_FOLDER, WEIGHTS_PATH

'''
get predict params
returns a list elements:
model - string: name of the model
userid - int: model's userid
concepts - int[]: list of concept ids model is trying to find
video - int: id of video to predict on
upload_annotations - boolean: if true upload annotations to database
'''
cursor.execute("SELECT * FROM predict_params")
params = cursor.fetchone()
print(params)
model_name = str(params[0])
userid = int(params[1])
concepts = params[2]
videoids = params[4]
upload_annotations = bool(params[3])
previous_run_id = int(params[5])

s3.download_file(S3_BUCKET, S3_WEIGHTS_FOLDER +
                 model_name + '.h5', WEIGHTS_PATH)
print('weight file downloaded')

# cursor.execute("""DELETE FROM predict_progress""")
# con.commit()
# cursor.execute(
#     """
#     INSERT INTO predict_progress (videoid, current_video, total_videos)
#     VALUES (%s, %s, %s)""",
#     (0, 0, len(verifyVideos)),
# )
# con.commit()

for video_id in videoids:
    # cursor.execute(
    #     f"""UPDATE predict_progress SET videoid = {video_id}, current_video = current_video + 1"""
    # )
    # con.commit()
    evaluate(video_id, model_name + "_" + str(userid), concepts,
             upload_annotations=upload_annotations, previous_run_id=previous_run_id)

# cursor.execute(
#     """
#     UPDATE predict_progress
#     SET status=4
#     """
# )

# cursor.execute(
#     "Update modeltab SET info =  '{\"activeStep\": 0, \"modelSelected\":\"\",\"videoSelected\":\"\",\"userSelected\":\"\"}' WHERE option = 'predictmodel'")
con.commit()
con.close()
subprocess.call(["sudo", "shutdown", "-h"])

#!/usr/bin/env bash
cd /home/ubuntu/video-annotation-tool/ml/
source /home/ubuntu/.virtualenvs/cv/bin/activate
python /home/ubuntu/video-annotation-tool/ml/evaluate_prediction_vid.py > blah.txt 2> error.txt &

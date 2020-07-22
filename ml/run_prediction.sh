#!/usr/bin/env bash
cd /home/ubuntu/video-annotation-tool/ml/
source /home/ubuntu/.virtualenvs/cv/bin/activate
python3 -u /home/ubuntu/video-annotation-tool/ml/predict_command.py > results_pred.txt 2> error_pred.txt &

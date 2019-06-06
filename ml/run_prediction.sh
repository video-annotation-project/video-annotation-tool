#!/usr/bin/env bash
cd /home/ubuntu/video-annotation-tool/ml/
source /home/ubuntu/.virtualenvs/cv/bin/activate
python /home/ubuntu/video-annotation-tool/ml/predict_command.py > log.txt 2> error.txt &

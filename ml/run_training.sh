#!/usr/bin/env bash
cd /home/ubuntu/video-annotation-tool/ml/
source /home/ubuntu/.virtualenvs/cv/bin/activate
python3 -u /home/ubuntu/video-annotation-tool/ml/train_command.py > stdout.txt 2> stderr.txt 
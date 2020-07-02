#!/usr/bin/env bash
cd /home/ubuntu/video-annotation-tool/ml/
workon cv
python3 -u /home/ubuntu/video-annotation-tool/ml/train_command.py > results.txt 2> error.txt &

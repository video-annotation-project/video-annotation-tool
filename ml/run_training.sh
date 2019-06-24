#!/usr/bin/env bash
cd /home/ubuntu/video-annotation-tool/ml/
nohup python3 -u /home/ubuntu/video-annotation-tool/ml/train_command.py > results.txt 2> error.txt &

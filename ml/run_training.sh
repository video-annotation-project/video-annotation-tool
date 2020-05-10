#!/usr/bin/env bash
cd /home/ec2-user/video-annotation-tool/ml/
source activate tensorflow2_p36
python3 -u /home/ec2-user/video-annotation-tool/ml/train_command.py > results.txt 2> error.txt &

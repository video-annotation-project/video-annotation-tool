#!/usr/bin/env bash
cd /home/ubuntu/video-annotation-tool/ml/
source /home/ubuntu/.virtualenvs/cv/bin/activate
python3 -u /home/ubuntu/video-annotation-tool/ml/track_command.py > results_track.txt 2> error_track.txt &


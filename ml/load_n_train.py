# Loads data, updates anchor boxes, and trains.
from loading_data import download_annotations
import json
import os
from dotenv import load_dotenv
import argparse
import shutil
import subprocess
import time

start = time.time()
argparser = argparse.ArgumentParser()
argparser.add_argument(
    '-c',
    '--conf',
    default='config.json',
    help='path to configuration file')


args = argparser.parse_args()
config_path = args.conf

load_dotenv(dotenv_path="../.env")
with open(config_path) as config_buffer:    
    config = json.loads(config_buffer.read())

concepts = list(map(int, config['model']['labels']))
min_examples = config['data']['min_examples']
num_anchors = config['data']['num_anchors']
bad_users = json.loads(os.getenv("BAD_USERS"))


folders = []
folders.append(config['train']["train_image_folder"])
folders.append(config['train']["train_annot_folder"])
folders.append(config['valid']["valid_annot_folder"])
folders.append(config['valid']["valid_image_folder"])

for dir in folders:
	if os.path.exists(dir):
	    shutil.rmtree(dir)
	os.makedirs(dir)

end = time.time()
print("Done Initializing: " + str((end - start)/60) + " minutes")

print("Starting Download.")
start = time.time()

download_annotations(min_examples,concepts, bad_users)

end = time.time()
print("Done Downloading Annotations: " + str((end - start)/60) + " minutes")

print("Getting Anchors.")
start = time.time()

p = subprocess.Popen(("python3 gen_anchors.py -c " + config_path + " -a " + str(num_anchors)).split(),
                     stdout=subprocess.PIPE)
preprocessed, _ = p.communicate()

anchors = json.loads(preprocessed.decode('UTF-8'))

config['model']['anchors'] = anchors

with open(config_path, 'w') as file:
	json.dump(config, file, sort_keys=True, indent=4)

end = time.time()
print("Done Getting Anchors: " + str((end - start)/60) + " minutes")

print("Starting Training.")
start = time.time()

p = subprocess.Popen(("python3 train.py -c " + config_path).split(),
                     stdout=subprocess.PIPE)


end = time.time()
print("Done Training: " + str((end - start)/60) + " minutes")
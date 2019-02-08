# Loads data, updates anchor boxes, and trains.
from loading_data import download_annotations
from loading_data import queryDB
import json
import os
from dotenv import load_dotenv
import argparse
import shutil
import subprocess
import time
from keras_retinanet import models
from keras_retinanet import losses
from keras_retinanet.preprocessing.csv_generator import CSVGenerator
from keras_retinanet.utils.transform import random_transform_generator
import keras 
import pandas as pd

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

concepts = config['conceptids']
train_annot_file = config['train_annot_file']
valid_annot_file = config['valid_annot_file']
img_folder = config['image_folder']

class_map_file = config['class_map']
min_examples = config['min_examples']
model_path = config['model_weights']

bad_users = json.loads(os.getenv("BAD_USERS"))

if False:
    folders = []
    folders.append(img_folder)
    for dir in folders:
        if os.path.exists(dir):
            shutil.rmtree(dir)
        os.makedirs(dir)

    '''
    Initializes the classmap of concept names to training id's.
    (these id's don't represent the conceptid's from our database)
    '''
    start = time.time()
    print("Initializing Classmap.")

    classmap = []
    for concept in concepts:
        name = queryDB("select name from concepts where id=" + str(concept)).iloc[0]["name"]
        classmap.append([name,concepts.index(concept)])
    classmap = pd.DataFrame(classmap)
    classmap.to_csv(class_map_file,index=False, header=False)
    classmap = classmap.to_dict()[0]

    end = time.time()
    print("Done Initializing Classmap: " + str((end - start)/60) + " minutes")


    '''
    Downloads the annotation data and saves it into training and validation csv's.
    Also downloads corresponding images.
    '''
    start = time.time()
    print("Starting Download.")

    download_annotations(min_examples, concepts, classmap, bad_users, img_folder, train_annot_file, valid_annot_file)

    end = time.time()
    print("Done Downloading Annotations: " + str((end - start)/60) + " minutes")


'''
Trains the model!!!!! WOOOT WOOOT!
'''
start = time.time()
print("Starting Training.")

model = models.backbone('resnet50').retinanet(num_classes=len(concepts))

#model.load_weights(model_path, skip_mismatch=True)

model.compile(
    loss={
        'regression'    : losses.smooth_l1(),
        'classification': losses.focal()
    },
    optimizer=keras.optimizers.adam(lr=1e-5, clipnorm=0.001)
)
transform_generator = random_transform_generator(
    min_rotation=-0.1,
    max_rotation=0.1,
    min_translation=(-0.1, -0.1),
    max_translation=(0.1, 0.1),
    min_shear=-0.1,
    max_shear=0.1,
    min_scaling=(0.9, 0.9),
    max_scaling=(1.1, 1.1),
    flip_x_chance=0.5,
    flip_y_chance=0.5,
)
train_generator = CSVGenerator(
    train_annot_file,
    class_map_file,
    transform_generator=transform_generator,
)
test_generator = CSVGenerator(
    valid_annot_file,
    class_map_file,
)
model.fit_generator(train_generator, epochs=10, validation_data=test_generator)

end = time.time()
print("Done Training Model: " + str((end - start)/60) + " minutes")



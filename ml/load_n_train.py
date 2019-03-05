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
from keras_retinanet.utils.model import freeze as freeze_model
from keras.utils import multi_gpu_model
from keras.callbacks import ModelCheckpoint, EarlyStopping
from keras_retinanet.models.retinanet import retinanet_bbox
from keras_retinanet.callbacks import RedirectModel

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
model_path = config['model_weights']

min_examples = config['min_examples']
gpus = config['gpus']
test_examples = config['test_examples']
epochs = config['epochs']


bad_users = json.loads(os.getenv("BAD_USERS"))

'''
Just load classmap without loading new data
'''
classmap = pd.read_csv(class_map_file, header=None).to_dict()[0]
'''
Initializes the classmap of concept names to training id's.
(these id's don't represent the conceptid's from our database)
Then downloads the annotation data and saves it into training and validation csv's.
Also downloads corresponding images.
'''
'''
folders = []
folders.append(test_examples)
folders.append(img_folder)
for dir in folders:
    if os.path.exists(dir):
        shutil.rmtree(dir)
    os.makedirs(dir)

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

start = time.time()
print("Starting Download.")

download_annotations(min_examples, concepts, classmap, bad_users, img_folder, train_annot_file, valid_annot_file)

end = time.time()
print("Done Downloading Annotations: " + str((end - start)/60) + " minutes")
'''
'''
Trains the model!!!!! WOOOT WOOOT!
'''
start = time.time()
print("Starting Training.")

model = models.backbone('resnet50').retinanet(num_classes=len(concepts), modifier=freeze_model)
model.load_weights(model_path, by_name=True, skip_mismatch=True)

if gpus > 1:
    training_model = multi_gpu_model(model, gpus=gpus)
else:
    training_model = model

training_model.compile(
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
    batch_size = 16
)
test_generator = CSVGenerator(
    valid_annot_file,
    class_map_file,
    batch_size = 16,
    shuffle_groups=False
)

# Checkpoint: save models that are improvements
filepath = "weights/weights-{epoch:02d}-{val_loss:.4f}.h5"
checkpoint = ModelCheckpoint(filepath, monitor='val_loss', save_best_only=True)
checkpoint = RedirectModel(checkpoint, model)

#stopping: stops training if val_loss stops improving
stopping = EarlyStopping(monitor='val_loss', min_delta=0, patience=5)

history = training_model.fit_generator(train_generator, 
    epochs=epochs, 
    callbacks=[checkpoint, stopping],
    validation_data=test_generator,
    verbose=2
).history

end = time.time()
print("Done Training Model: " + str((end - start)/60) + " minutes")

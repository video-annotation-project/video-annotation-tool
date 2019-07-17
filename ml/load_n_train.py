import json
import os
import shutil
import subprocess
import time
import random

import keras 
import pandas as pd
import tensorflow as tf
import skimage as sk
import numpy as np
import boto3
from keras_retinanet import models
from keras_retinanet import losses
from keras_retinanet.preprocessing.csv_generator import CSVGenerator
from keras_retinanet.utils.transform import random_transform_generator
from keras_retinanet.utils.model import freeze as freeze_model
from keras.utils import multi_gpu_model
from keras.callbacks import ModelCheckpoint, EarlyStopping
from keras_retinanet.models.retinanet import retinanet_bbox
from keras_retinanet.callbacks import RedirectModel
from tensorflow.python.client import device_lib
from dotenv import load_dotenv

from loading_data import download_annotations
from loading_data import queryDB, get_classmap
from progress_callbacks import Progress
from progress_callbacks import TensorBoardLog
from tensorboard_logs import create_log_entry


config_path = "../config.json"
load_dotenv(dotenv_path="../.env")
with open(config_path) as config_buffer:    
    config = json.loads(config_buffer.read())['ml']

train_annot_file = config['train_annot_file']
valid_annot_file = config['valid_annot_file']
img_folder = config['image_folder']
batch_size = config['batch_size']
weights_path = config['weights_path']

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv('AWS_S3_BUCKET_NAME')
S3_BUCKET_WEIGHTS_FOLDER = os.getenv('AWS_S3_BUCKET_WEIGHTS_FOLDER')
s3 = boto3.client('s3', aws_access_key_id = AWS_ACCESS_KEY_ID, aws_secret_access_key = AWS_SECRET_ACCESS_KEY)

# Wrapper for csv generator to allow for further data augmentation
class custom(CSVGenerator):
    def __getitem__(self, index):
        inputs, targets = CSVGenerator.__getitem__(self, index)

        # for i,x in enumerate(inputs):
        #     temp = x
        #     temp = sk.exposure.rescale_intensity(temp,in_range=(0,255))
        #     temp = sk.util.random_noise(temp, var= random.uniform(0,.0005))
        #     temp = sk.exposure.adjust_gamma(temp,gamma=random.uniform(.5,1.5))
        #     inputs[i] = np.array(temp)

        return inputs, targets


def train_model(concepts, model_name, collectionIds, min_examples,
                epochs, download_data=True):

    classmap = get_classmap(concepts)
    
    # Downloads the annotation data and saves it into training and validation csv's.
    # Also downloads corresponding images.
    
    if download_data:
        folders = ["weights"]
        for dir in folders:
            if os.path.exists(dir):
                shutil.rmtree(dir)
            os.makedirs(dir)

        start = time.time()
        print("Starting Download.")

        download_annotations(min_examples, collectionIds, concepts,
                             classmap, img_folder, train_annot_file, valid_annot_file)

        end = time.time()
        print("Done Downloading Annotations: " + str((end - start)/60) + " minutes")


    # Trains the model!!!!! WOOOT WOOOT!

    start = time.time()
    print("Starting Training.")

    # Suggested to initialize model on cpu before turning into a 
    # multi_gpu model to save gpu memory
    with tf.device('/cpu:0'):
        model = models.backbone('resnet50').retinanet(num_classes=len(concepts))#modifier=freeze_model)
        model.load_weights(weights_path, by_name=True, skip_mismatch=True)

    gpus = len([i for i in device_lib.list_local_devices() if i.device_type == 'GPU'])


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
    
    # transform_generator = random_transform_generator(
    #     min_rotation=-0.1,
    #     max_rotation=0.1,
    #     min_translation=(-0.1, -0.1),
    #     max_translation=(0.1, 0.1),
    #     min_shear=-0.1,
    #     max_shear=0.1,
    #     min_scaling=(0.9, 0.9),
    #     max_scaling=(1.1, 1.1),
    #     flip_x_chance=0.5,
    #     flip_y_chance=0.5,
    # )
    
    temp = pd.DataFrame(list(zip(classmap.values(), classmap.keys())))
    temp.to_csv('classmap.csv',index=False, header=False)
    train_generator = custom(
        train_annot_file,
        'classmap.csv',
        # transform_generator=transform_generator,
        batch_size = batch_size
    )

    test_generator = CSVGenerator(
        valid_annot_file,
        'classmap.csv',
        batch_size = batch_size,
        shuffle_groups=False
    )


    # Checkpoint: save models that are improvements
    checkpoint = ModelCheckpoint(weights_path, monitor='val_loss', save_best_only=True)
    checkpoint = RedirectModel(checkpoint, model)

    #stopping: stops training if val_loss stops improving
    stopping = EarlyStopping(monitor='val_loss', min_delta=0, patience=10)

    log_table_name = 'previous_runs'

    # Initialize a log entry in the previous_runs table
    # TODO: put this in progress_callbacks.py, it makes more sense there
    # tb_log_id = create_log_entry(
    #     table_name=log_table_name,
    #     model_name=model_name,
    #     users=users,
    #     videos=videos,
    #     min_examples=min_examples,
    #     concepts=selected_concepts,
    #     epochs=epochs
    # )

    # Every epoch upload tensorboard logs to the S3 bucket
    log_callback = TensorBoardLog(id_=tb_log_id, table_name=log_table_name)

    tensorboard_callback = keras.callbacks.TensorBoard(
        log_dir=f'./logs/{tb_log_id}', histogram_freq=0, batch_size=batch_size,
        write_graph=True, write_grads=False, write_images=False,
        embeddings_freq=0, embeddings_layer_names=None,
        embeddings_metadata=None, embeddings_data=None, update_freq='epoch')

    # Every batch and epoch update a database table with the current progress
    progress_callback = Progress(
        steps_per_epoch=len(train_generator), num_epochs=epochs)
    
    history = training_model.fit_generator(train_generator, 
        epochs=epochs, 
        callbacks=[checkpoint, stopping,
            tensorboard_callback, progress_callback, log_callback],
        validation_data=test_generator,
        verbose=2
    ).history

    s3.upload_file(weights_path, S3_BUCKET, S3_BUCKET_WEIGHTS_FOLDER + model_name+".h5") 

    end = time.time()
    print("Done Training Model: " + str((end - start)/60) + " minutes")

    os.system("sudo shutdown -h")


if __name__ == '__main__':
    epochs = 1
    min_examples = 1
    model_name = "test"
    collectionId = 15
    train_model(concepts, model_name, collectionId, min_examples,
                epochs, download_data=True)

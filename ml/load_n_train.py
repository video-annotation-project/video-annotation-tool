from loading_data import download_annotations
from loading_data import queryDB, get_classmap
import json
import os
from dotenv import load_dotenv
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
import tensorflow as tf
import skimage as sk
import random
import numpy as np
from tensorflow.python.client import device_lib
import boto3

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
        '''
        for i,x in enumerate(inputs):
            temp = x
            temp = sk.exposure.rescale_intensity(temp,in_range=(0,255))
            temp = sk.util.random_noise(temp, var= random.uniform(0,.0005))
            temp = sk.exposure.adjust_gamma(temp,gamma=random.uniform(.5,1.5))
            inputs[i] = np.array(temp)
        '''
        return inputs, targets


def train_model(concepts, users, min_examples, epochs, model_name, videos, selected_concepts, download_data=True):

    classmap = get_classmap(concepts)
    '''
    Downloads the annotation data and saves it into training and validation csv's.
    Also downloads corresponding images.
    '''
    if download_data:
        folders = ["weights"]
        folders.append(img_folder)
        for dir in folders:
            if os.path.exists(dir):
                shutil.rmtree(dir)
            os.makedirs(dir)

        start = time.time()
        print("Starting Download.")

        download_annotations(min_examples, concepts, selected_concepts, classmap, users, videos, img_folder, train_annot_file, valid_annot_file)

        end = time.time()
        print("Done Downloading Annotations: " + str((end - start)/60) + " minutes")

    '''
    Trains the model!!!!! WOOOT WOOOT!
    '''
    start = time.time()
    print("Starting Training.")

    # Suggested to initialize model on cpu before turning into a multi_gpu model to save gpu memory
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
    '''
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
    '''
    temp = pd.DataFrame(list(zip(classmap.values(), classmap.keys())))
    temp.to_csv('classmap.csv',index=False, header=False)
    train_generator = custom(
        train_annot_file,
        'classmap.csv',
        #transform_generator=transform_generator,
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

    tensorboard_callback = keras.callbacks.TensorBoard(
        log_dir='./logs', histogram_freq=0, batch_size=batch_size,
        write_graph=True, write_grads=False, write_images=False,
        embeddings_freq=0, embeddings_layer_names=None,
        embeddings_metadata=None, embeddings_data=None, update_freq='epoch')
    
    history = training_model.fit_generator(train_generator, 
        epochs=epochs, 
        callbacks=[checkpoint, stopping, tensorboard_callback],
        validation_data=test_generator,
        verbose=2
    ).history

    s3.upload_file(weights_path, S3_BUCKET, S3_BUCKET_WEIGHTS_FOLDER + model_name+".h5") 

    end = time.time()
    print("Done Training Model: " + str((end - start)/60) + " minutes")

    os.system("sudo shutdown -h")

if __name__ == '__main__':
    epochs = 1
    users = [6]
    min_examples = 1
    concepts = [383]
    model_name = "jake_test"
    videos = [8]
    train_model(concepts, users, min_examples, epochs, model_name, videos, concepts, download_data=True)

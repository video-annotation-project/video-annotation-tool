import uuid
import sys

import json

import keras
import tensorflow as tf
import multiprocessing
from tensorflow.python.client import device_lib
from keras_retinanet import models
from keras_retinanet import losses
from keras.utils import multi_gpu_model
from keras.callbacks import EarlyStopping
from keras_retinanet.callbacks import RedirectModel

from config import config
from utils.query import s3, query
from utils.timer import timer
from utils.output import DatabaseOutput
from train.preprocessing.annotation_generator import AnnotationGenerator
from train.evaluation.evaluate import evaluate_class_thresholds
from train.callbacks.progress import Progress
from train.callbacks.tensorboard import TensorboardLog


@timer("training")
def train_model(concepts,
                verify_videos,
                model_name,
                collection_ids,
                min_examples,
                epochs,
                hierarchy_map,
                download_data=True,
                verified_only=False,
                include_tracking=True):
    """ Trains the model, uploads its weights, and determines best
        confidence thresholds for predicting
    """

    # Generate a random unique ID for this training job
    job_id = uuid.uuid4().hex

    model, training_model = _initilize_model(len(concepts))

    num_workers = _get_num_workers()

    _redirect_outputs(job_id)

    training_model.compile(
        loss={
            'regression': losses.smooth_l1(),
            'classification': losses.focal()
        },
        optimizer=keras.optimizers.adam(lr=1e-5, clipnorm=0.001)
    )

    print("initializing annotation generator")

    annotation_generator = AnnotationGenerator(
        collection_ids=collection_ids,
        verified_only=verified_only,
        include_tracking=include_tracking,
        min_examples=min_examples,
        classes=concepts,
        verify_videos=verify_videos,
        hierarchy_map=hierarchy_map,
    )
    # Get model name & version to insert into model_versions table
    #  a user dictionary containing the concept counts from this model
    #  for each userid
    model_name_str = model_name.split("-")[0]
    model_version = model_name.split("-")[-1]
    insert_counts_query = '''
        UPDATE
            model_versions
        SET
            concept_count = %s
        WHERE
            model = %s
            AND
            version = %s
    '''
    query(
            insert_counts_query,
            (json.dumps(annotation_generator.userDict), model_name_str, model_version)
    )
    

    train_generator = annotation_generator.flow_from_s3(
        image_folder=config.IMAGE_FOLDER,
        subset='training',
        batch_size=config.BATCH_SIZE
    )

    test_generator = annotation_generator.flow_from_s3(
        image_folder=config.IMAGE_FOLDER,
        subset='validation',
        batch_size=config.BATCH_SIZE
    )

    callbacks = _get_callbacks(
        model=model,
        job_id=job_id,
        model_name=model_name,
        collection_ids=collection_ids,
        min_examples=min_examples,
        epochs=epochs,
        steps_per_epoch=len(train_generator)
    )

    training_model.fit_generator(
        train_generator,
        epochs=epochs,
        callbacks=callbacks,
        validation_data=test_generator,
        use_multiprocessing=True,
        workers=num_workers,
        verbose=2
    )

    model.save(config.WEIGHTS_PATH)

    # Upload the weights file to the S3 bucket
    _upload_weights(model_name)

    # Evaluate the best confidence thresholds for the model
    evaluate_class_thresholds(model, test_generator)


def _initilize_model(num_classes):
    """Initilze our model to train with
    """

    # Suggested to initialize model on cpu before turning into a
    # multi_gpu model to save gpu memory
    with tf.device('/cpu:0'):
        model = models.backbone('resnet50').retinanet(num_classes=num_classes)
        model.load_weights(config.WEIGHTS_PATH,
                           by_name=True, skip_mismatch=True)

    gpus = len([i for i in device_lib.list_local_devices()
                if i.device_type == 'GPU'])

    if gpus > 1:
        return model, multi_gpu_model(model, gpus=gpus)
    return model, model


def _get_callbacks(model,
                   job_id,
                   model_name,
                   min_examples,
                   epochs,
                   collection_ids,
                   steps_per_epoch):
    """ Returns a list of callbacks to use while training.
    """

    # Stops training if val_loss stops improving
    stopping = EarlyStopping(
        monitor='val_loss', min_delta=0, patience=10, restore_best_weights=True)

    # Every epoch upload tensorboard logs to the S3 bucket
    log_callback = TensorboardLog(
        model_name=model_name,
        min_examples=min_examples,
        epochs=epochs,
        collection_ids=collection_ids,
        job_id=job_id
    )

    # Save tensorboard logs to appropriate folder
    tensorboard_callback = keras.callbacks.TensorBoard(
        log_dir=f'./logs/{job_id}',
        batch_size=config.BATCH_SIZE,
    )

    # Every batch and epoch update a database table with the current progress
    progress_callback = Progress(
        job_id=job_id,
        steps_per_epoch=steps_per_epoch,
        num_epochs=epochs
    )

    # It's important that tensorboard_callback is before log_callback,
    # so the board is created/updated before being uploaded
    return [stopping, progress_callback, tensorboard_callback, log_callback]


def _upload_weights(model_name):
    """ Upload model weights to s3 bucket
    """
    s3.upload_file(
        config.WEIGHTS_PATH,
        config.S3_BUCKET,
        config.S3_WEIGHTS_FOLDER + model_name + ".h5"
    )


def _redirect_outputs(job_id):
    """ The DatabaseOutput class will redirect this programs output to a column
        in out training_progress database (as well as into a file)
    """
    sys.stdout = DatabaseOutput(job_id, 'out')
    sys.stderr = DatabaseOutput(job_id, 'err')


def _get_num_workers():
    """ Returns the number of cores on this machine.
        1 worker per core should give us maximum preformance.
    """
    # Subtract 1 for the main thread
    return multiprocessing.cpu_count() - 2

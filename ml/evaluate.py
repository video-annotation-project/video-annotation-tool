from keras_retinanet.utils.eval import evaluate
import argparse
import os
from dotenv import load_dotenv
import json
from keras_retinanet import models
from keras_retinanet.utils.model import freeze as freeze_model
from keras.utils import multi_gpu_model
from keras_retinanet import losses
from keras_retinanet.preprocessing.csv_generator import CSVGenerator
from keras_retinanet.models.retinanet import retinanet_bbox
import keras

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

gpus = config['gpus']
valid_annot_file = config['valid_annot_file']
concepts = config['conceptids']
model_path = config['model_weights']
class_map_file = config['class_map']

model = models.backbone('resnet50').retinanet(num_classes=len(concepts), modifier=freeze_model)

model.load_weights(model_path, by_name=True, skip_mismatch=True)

model = retinanet_bbox(model)

test_generator = CSVGenerator(
    valid_annot_file,
    class_map_file,
)

map_vals = evaluate(test_generator,model,save_path="test_images")

print(map_vals)

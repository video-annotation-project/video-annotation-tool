import argparse
import os
from dotenv import load_dotenv
import json
import shutil
from loading_data import queryDB, get_classmap
from loading_data import download_annotations
import pandas as pd
from keras_retinanet import models
from keras_retinanet.utils.model import freeze as freeze_model
from keras.utils import multi_gpu_model
from keras_retinanet import losses
from keras_retinanet.preprocessing.csv_generator import CSVGenerator
from keras_retinanet.models.retinanet import retinanet_bbox
import keras
from model_scoring import f1_evaluation
from keras_retinanet.utils.eval import evaluate
from keras_retinanet.models import convert_model
from keras_retinanet.models import load_model
 

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

train_annot_file = config['train_annot_file']
valid_annot_file = config['valid_annot_file']
img_folder = config['image_folder']
test_examples = config['test_examples']
batch_size = config['batch_size']



'''
    Evaluates the model using testing data, printing out an F1 score as well as optimal confidence thresholds for each concept
'''
def evaluate_model(concepts, model_path,  min_examples, download_data=False):

    classmap = get_classmap(concepts)

    if download_data:
        folders = []
        folders.append(test_examples)
        folders.append(img_folder)
        for dir in folders:
            if os.path.exists(dir):
                shutil.rmtree(dir)
            os.makedirs(dir)
        download_annotations(min_examples, concepts, classmap, bad_users, img_folder, train_annot_file, valid_annot_file, split=0)

    '''
    Initializing model for eval
    '''
    model = load_model(model_path, backbone_name='resnet50')
    model = convert_model(model)

    temp = pd.DataFrame(list(zip(classmap.values(), classmap.keys())))
    temp.to_csv('classmap.csv',index=False, header=False)
    test_generator = CSVGenerator(
        valid_annot_file,
        'classmap.csv',
        shuffle_groups=False,
        batch_size=batch_size
    )

    best_f1, best_thresh = f1_evaluation(test_generator, model, save_path=test_examples)

    total_f1 = 0
    for concept, f1 in best_f1.items():
        print("Concept: " + classmap[concept])
        print("F1 Score: " + str(f1))
        print("Confidence Threshold: " + str(best_thresh[concept]))
        print("")
        total_f1 += f1

    print("Average F1: " + str(total_f1/len(best_f1)))
    print("Find evaluation examples in: " + test_examples)
    '''
    average_precisions = evaluate(test_generator, model, save_path=test_examples)

    for concept, (ap, instances) in average_precisions.items():
        print(classmap[concept] +": " + str(ap) + " with " + str(instances) + " instances")
        
    print("Find evaluation examples in: " + test_examples)
    '''

if __name__ == '__main__':
    min_examples = 1000
    concepts = [1629, 1210, 236, 383, 1133]
    model_path = 'current_weights.h5'

    evaluate_model(concepts, model_path,  min_examples, download_data=False)


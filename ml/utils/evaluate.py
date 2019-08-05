from model_scoring import f1_evaluation
from keras_retinanet.models import convert_model
from keras_retinanet.models import load_model

import config


def evaluate_class_thresholds(model, generator):
    '''
    Evaluates the model using testing data
    printing out an F1 score as well as optimal confidence thresholds for each concept
    '''

    # Initializing model for eval
    model = convert_model(model)

    best_f1, best_thresh = f1_evaluation(generator, model, save_path=config.TEST_EXAMPLES)

    total_f1 = 0
    for concept, f1 in best_f1.items():
        print("Concept: " + str(concept))
        print("F1 Score: " + str(f1))
        print("Confidence Threshold: " + str(best_thresh[concept]))
        print("")
        total_f1 += f1


if __name__ == '__main__':
    min_examples = 1000
    concepts = [1629, 1210, 236, 383, 1133]
    model_path = config.WEIGHTS_PATH

    evaluate_class_thresholds(concepts, model_path, min_examples, download_data=False)

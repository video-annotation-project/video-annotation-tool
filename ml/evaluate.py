'''
eval should really make it in a seperate file.
'''
from keras_retinanet.utils.eval import evaluate
import argparse

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


model = models.backbone('resnet50').retinanet(num_classes=len(concepts), modifier=freeze_model)
if(gpus > 1):
	model = multi_gpu_model(model, gpu=gpus)
model.load_weights(model_path, by_name=True, skip_mismatch=True)

model.compile(
    loss={
        'regression'    : losses.smooth_l1(),
        'classification': losses.focal()
    },
    optimizer=keras.optimizers.adam(lr=1e-5, clipnorm=0.001)
)

test_generator = CSVGenerator(
    valid_annot_file,
    class_map_file,
)

map_vals = evaluate(test_generator,model,save_path="test_images")

print(map_vals)
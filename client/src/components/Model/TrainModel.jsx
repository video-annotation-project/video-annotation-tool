import React, { Component } from 'react';
import axios from 'axios';
import TextField from '@material-ui/core/TextField';
import io from 'socket.io-client';
import Input from '@material-ui/core/Input';
import Paper from '@material-ui/core/Paper';
import { FormControl } from '@material-ui/core';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

import ModelProgress from './ModelProgress';
import VideoMetadata from '../Utilities/VideoMetadata';
import CollectionInfo from '../Utilities/CollectionInfo';

import './TrainModel.css';

const styles = theme => ({
  infoButton: {
    marginTop: theme.spacing(2)
  },
  switches: {
    marginTop: theme.spacing()
  },
  options: {
    marginLeft: theme.spacing(1.5),
    marginRight: theme.spacing(1.5)
  }
});

const paramFields = [
  'epochs',
  'minImages',
  'modelSelected',
  'annotationCollections',
  'includeTracking',
  'verifiedOnly'
];

function ModelsForm(props) {
  const { className, modelSelected, handleChange, models } = props;
  return (
    <FormControl component="fieldset" className={className}>
      <InputLabel shrink>Model</InputLabel>
      <Select
        name="modelSelected"
        value={modelSelected || 'Loading...'}
        onChange={handleChange}
      >
        {models.map(model => (
          <MenuItem key={model.name} value={model.name}>
            {model.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function CollectionsForm(props) {
  const { className, annotationCollections, onChange, collections } = props;
  return (
    <FormControl component="fieldset" className={className}>
      <InputLabel shrink>Annotations</InputLabel>
      <Select
        multiple
        name="selectedAnnotations"
        value={annotationCollections}
        onChange={onChange}
        input={<Input id="select-multiple" />}
        renderValue={selected =>
          selected.map(collection => collection.name).join(', ') || 'Loading...'
        }
      >
        {collections.map(collection => (
          <MenuItem
            key={collection.id}
            value={collection}
            disabled={collection.disable}
          >
            <Checkbox
              checked={annotationCollections.indexOf(collection) > -1}
            />
            <ListItemText>
              {collection.name}
              {collection.validConcepts ? (
                <Typography variant="subtitle2" gutterBottom color="secondary">
                  {collection.validConcepts.map((concept, index) => {
                    if (index === collection.validConcepts.length - 1) {
                      return concept.f1;
                    }
                    return `${concept.f1}, `;
                  })}
                </Typography>
              ) : (
                ''
              )}
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function EpochsField(props) {
  const { className, epochs, onChange } = props;
  return (
    <TextField
      margin="normal"
      className={className}
      name="epochs"
      label="Epochs"
      value={epochs}
      onChange={onChange}
    />
  );
}

function ImagesField(props) {
  const { className, minImages, onChange } = props;

  return (
    <TextField
      margin="normal"
      className={className}
      name="minImages"
      label="# of Images"
      value={minImages}
      onChange={onChange}
      // helperText={getImageRange()}
    />
  );
}

class TrainModel extends Component {
  constructor(props) {
    super(props);
    // here we do a manual conditional proxy because React won't do it for us
    let socket;
    if (window.location.origin === 'http://localhost:3000') {
      console.log('manually proxying socket');
      socket = io('http://localhost:3001');
    } else {
      socket = io();
    }
    socket.on('connect', () => {
      console.log('socket connected!');
    });
    socket.on('reconnect_attempt', attemptNumber => {
      console.log('reconnect attempt', attemptNumber);
    });
    socket.on('disconnect', reason => {
      console.log(reason);
    });
    socket.on('refresh trainmodel', this.loadOptionInfo);

    this.state = {
      models: [],
      modelSelected: undefined,
      collections: [],
      annotationCollections: [],
      selectedCollectionCounts: [],
      minCounts: [],
      includeTracking: false,
      verifiedOnly: false,
      infoDialogOpen: false,
      openedVideo: null,
      epochs: '',
      minImages: '',
      ready: false
    };
  }

  componentDidMount = async () => {
    await this.loadExistingModels();
    this.loadCollectionList();
  };

  // Methods for video meta data
  openVideoMetadata = (event, video) => {
    event.stopPropagation();
    this.setState({
      openedVideo: video
    });
  };

  closeVideoMetadata = () => {
    this.setState({
      openedVideo: null
    });
  };

  loadOptionInfo = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios
      .get(`/api/models/train`, config)
      .then(res => {
        const params = res.data;

        this.setState({
          modelSelected: params.model,
          minImages: params.min_images,
          epochs: params.epochs,
          selectedCollectionIds: params.annotation_collections
        });
      })
      .catch(error => {
        console.log('Error in get /api/models');
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  loadExistingModels = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios
      .get(`/api/models`, config)
      .then(res => {
        this.setState({
          models: res.data
        });
      })
      .catch(error => {
        console.log('Error in get /api/models');
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  loadCollectionList = () => {
    const { models, modelSelected } = this.state;

    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    return axios
      .get(`/api/collections/annotations?train=true`, config)
      .then(res => {
        const selectedModelTuple = models.find(model => {
          return model.name === modelSelected;
        });

        let modelConcepts;

        if (modelSelected === undefined) {
          modelConcepts = [];
        } else {
          modelConcepts = selectedModelTuple.conceptsid;
        }

        res.data.forEach(col => {
          const filtered = modelConcepts.filter(x => col.ids.includes(x));
          if (filtered.length > 0) {
            col.disable = false;
            col.validConcepts = col.concepts.filter(y =>
              filtered.includes(y.f2)
            );
          } else {
            col.disable = true;
          }
        });
        this.setState({
          collections: res.data.sort(a => (a.validConcepts ? -1 : 1)),
          annotationCollections: [],
          selectedCollectionCounts: [],
          minCounts: [],
          includeTracking: false,
          verifiedOnly: false
        });
      });
  };

  // Handle user, video, and concept checkbox selections
  checkboxSelect = (stateName, stateValue, id) => event => {
    let deepCopy = JSON.parse(JSON.stringify(stateValue));
    if (event.target.checked) {
      deepCopy.push(id);
    } else {
      deepCopy = deepCopy.filter(user => user !== id);
    }
    this.setState({
      [stateName]: deepCopy
    });
  };

  // Used to handle changes in the hyperparameters and in the select model
  handleChange = event => {
    event.persist();
    this.setState(
      {
        [event.target.name]: event.target.value
      },
      () => {
        if (event.target.name === 'modelSelected') {
          this.loadCollectionList();
        }
      }
    );
  };

  handleChangeSwitch = event => {
    event.persist();
    this.setState({
      [event.target.value]: event.target.checked
    });
  };

  handleStop = () => {
    this.setState({}, () => {
      this.postModelInstance('stop');
    });
  };

  postModelInstance = command => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      command,
      modelInstanceId: 'i-011660b3e976035d8'
    };

    axios.post(`/api/models/train`, body, config).then(res => {
      console.log(res);
    });
  };

  handleChangeMultiple = event => {
    const options = event.target.value;
    const value = [];
    for (let i = 0, l = options.length; i < l; i += 1) {
      value.push(options[i]);
    }
    this.setState(
      {
        annotationCollections: value
      },
      () => {
        this.getCollectionCounts();
      }
    );
  };

  // getImageRange = () => {
  //   const {
  //     annotationCollections,
  //     minCounts,
  //     includeTracking,
  //     verifiedOnly
  //   } = this.state;

  //   if (!annotationCollections.length || !minCounts.length) return '';

  //   let selection;
  //   if (verifiedOnly) {
  //     if (includeTracking) {
  //       selection = 3;
  //     } else {
  //       selection = 2;
  //     }
  //   } else if (includeTracking) {
  //     selection = 1;
  //   } else {
  //     selection = 0;
  //   }

  //   return minCounts[selection] === 1
  //     ? `Must be 1`
  //     : `Must be 1–${minCounts[selection]}`;
  // };

  handleChangeMultiple = event => {
    const options = event.target.value;
    const value = [];
    for (let i = 0, l = options.length; i < l; i += 1) {
      value.push(options[i]);
    }
    this.setState(
      {
        annotationCollections: value,
        ready: this.checkReady()
      },
      () => {
        this.getCollectionCounts();
      }
    );
  };

  toggleInfo = () => {
    this.setState(prevState => ({
      infoDialogOpen: !prevState.infoDialogOpen
    }));
  };

  getCollectionCounts = async () => {
    const { annotationCollections } = this.state;
    const validConcepts = [];

    annotationCollections.forEach(collection => {
      collection.validConcepts.forEach(concept => {
        validConcepts.push(concept.f2);
      });
    });

    try {
      const res = await axios.get(`/api/collections/annotations/counts`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          ids: annotationCollections.map(collection => collection.id),
          validConcepts
        }
      });

      if (res) {
        const minCounts = [];
        minCounts.push(Math.min(...res.data.map(count => count.user)));
        minCounts.push(
          Math.min(
            ...res.data.map(
              count => parseInt(count.user, 10) + parseInt(count.tracking, 10)
            )
          )
        );
        minCounts.push(Math.min(...res.data.map(count => count.verified_user)));
        minCounts.push(
          Math.min(
            ...res.data.map(
              count =>
                parseInt(count.verified_user, 10) + parseInt(count.tracking, 10)
            )
          )
        );

        this.setState({
          selectedCollectionCounts: res.data,
          minCounts
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  startTraining = async () => {
    try {
      await this.updateModelParams();
    } catch (error) {
      console.log(error);
    }
    this.postModelInstance();
  };

  stopTraining = () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      };
      axios.patch('/api/models/train/stop', {}, config);
    } catch (error) {
      console.log(error);
    }
  };

  resetTraining = () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      };

      axios.patch('/api/models/train/reset', {}, config);
    } catch (error) {
      console.log(error);
    }
  };

  updateModelParams = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    const {
      epochs,
      minImages,
      annotationCollections,
      modelSelected,
      verifiedOnly,
      includeTracking
    } = this.state;

    const body = {
      epochs,
      minImages,
      includeTracking,
      verifiedOnly,
      modelSelected,
      annotationCollections: annotationCollections.map(c => c.id)
    };

    return axios.put('/api/models/train', body, config);
  };

  checkReady = () => {
    const { state } = this;

    const notReady = paramFields.find(key => {
      return (
        !Object.prototype.hasOwnProperty.call(state, key) ||
        state[key] === null ||
        state[key] === undefined ||
        (Array.isArray(state[key]) && state[key].length === 0) ||
        state[key] === ''
      );
    });

    return !notReady;
  };

  render() {
    const { classes, socket, loadVideos } = this.props;
    const {
      modelSelected,
      models,
      collections,
      annotationCollections,
      openedVideo,
      infoDialogOpen,
      selectedCollectionCounts,
      includeTracking,
      verifiedOnly,
      epochs,
      minImages,
      minCounts
    } = this.state;

    return (
      <div className="root">
        <Paper square>
          <div className="container">
            <div className="actionsContainer">
              <ModelsForm
                className="modelsForm"
                modelSelected={modelSelected}
                handleChange={this.handleChange}
                models={models}
              />
              <CollectionsForm
                className="collectionsForm"
                collections={collections}
                annotationCollections={annotationCollections}
                onChange={this.handleChangeMultiple}
              />
              <EpochsField
                className="epochsField"
                epochs={epochs}
                onChange={this.handleChange}
              />
              <ImagesField
                className="imagesField"
                minImages={minImages}
                onChange={this.handleChange}
                // getImageRange={this.getImageRange}
              />
            </div>
            {annotationCollections.length ? (
              <div className={classes.options}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  className={classes.infoButton}
                  onClick={this.toggleInfo}
                >
                  Training Info
                </Button>
                <div className={classes.switches}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeTracking}
                        onChange={this.handleChangeSwitch}
                        value="includeTracking"
                        color="primary"
                      />
                    }
                    label="Include tracking annotations"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={verifiedOnly}
                        onChange={this.handleChangeSwitch}
                        value="verifiedOnly"
                        color="primary"
                        disabled={!minCounts[2]}
                      />
                    }
                    label="Verified annotations only"
                  />
                </div>
              </div>
            ) : (
              ''
            )}
            <CollectionInfo
              open={infoDialogOpen}
              onClose={this.toggleInfo}
              counts={selectedCollectionCounts}
            />
            <Divider style={{ marginTop: '30px' }} variant="middle" />
            <ModelProgress
              className="progress"
              postStopFlag={this.postStopFlag}
              startTraining={this.startTraining}
              stopTraining={this.stopTraining}
              resetTraining={this.resetTraining}
              terminateTraining={() => this.postModelInstance('stop')}
              checkReady={this.checkReady}
            />
          </div>
        </Paper>
        {openedVideo && (
          <VideoMetadata
            open
            handleClose={this.closeVideoMetadata}
            openedVideo={openedVideo}
            socket={socket}
            loadVideos={loadVideos}
            modelTab
          />
        )}
      </div>
    );
  }
}

export default withStyles(styles)(TrainModel);

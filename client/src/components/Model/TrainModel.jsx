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

import ModelProgress from './ModelProgress';
import VideoMetadata from '../Utilities/VideoMetadata';

import './TrainModel.css';

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

class CollectionsForm extends Component {
  render() {
    return (
      <FormControl component="fieldset" className={this.props.className}>
        <InputLabel shrink>Annotations</InputLabel>
        <Select
          multiple
          name="annotationCollections"
          value={this.props.annotationCollections}
          onChange={this.props.onChange}
          input={<Input id="select-multiple" />}
          renderValue={selected =>
            selected.map(collection => collection.name).join(', ') ||
            'Loading...'
          }
        >
          {this.props.collections.map(collection => (
            <MenuItem key={collection.id} value={collection}>
              <Checkbox
                checked={
                  this.props.annotationCollections.indexOf(collection) > -1
                }
              />
              <ListItemText>
                {collection.name}
                {collection.concepts ? (
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    color="textSecondary"
                    className="collectionsConcepts"
                  >
                    {collection.concepts.join(', ')}
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
}

class EpochsField extends Component {

  render() {
    return (
      <TextField
        margin="normal"
        className={this.props.className}
        name="epochs"
        label="Epochs"
        value={this.props.epochs}
        onChange={this.props.onChange}
      />
    );
  }
}

class ImagesField extends Component {

  render() {
    return (
      <TextField
        margin="normal"
        className={this.props.className}
        name="minImages"
        label="# of Images"
        value={this.props.minImages}
        onChange={this.props.onChange}
      />
    );
  }
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
      modelSelected: null,
      collections: [],
      annotationCollections: [],
      openedVideo: null
    };
  }

  componentDidMount = async () => {
    await this.loadOptionInfo();
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
    const selectedModelTuple = models.find(model => {
      return model.name === modelSelected;
    });

    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    return axios
      .get(
        `/api/collections/annotations?train=${selectedModelTuple.conceptsid}`,
        config
      )
      .then(res => {
        const annotationCollections = this.state.selectedCollectionIds.map(
            (collId) => res.data.find((c) => c.id === collId)
        ).filter((x) => x);

        this.setState({
          collections: res.data,
          annotationCollections: annotationCollections
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
    this.setState({
      [event.target.name]: event.target.value
    }, async () =>  { 
      if (event.target.name === 'modelSelected'){
        await this.loadCollectionList();
        this.updateModelParams({annotationCollections: this.state.annotationCollections.map((v) => v.id)});
      }
    });

    this.updateModelParams({[event.target.name]: event.target.value});
  };

  handleChangeMultiple = event => {
    const options = event.target.value;
    const values = [];
    for (let i = 0, l = options.length; i < l; i += 1) {
      values.push(options[i]);
    }
    this.setState({
      annotationCollections: values
    });
    this.updateModelParams({annotationCollections: values.map((v) => v.id)});
  };

  handleStop = () => {
    this.setState(
      {
        activeStep: 0
      },
      () => {
        this.postModelInstance('stop');
      }
    );
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

  updateModelParams = (params) => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    const body = {
      ...params,
    };

    try {
      axios.put(`/api/models/train`, body, config);
    } catch (err) {
      console.log(err);
    }
  };

  postStopFlag = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      stop_flag: true
    };
    console.log('post flag');
    try {
      const res = await axios.patch(`/api/models/train/stop`, body, config);
      console.log(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  render() {
    const { socket, loadVideos } = this.props;
    const {
      modelSelected,
      models,
      collections,
      annotationCollections,
      openedVideo
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
                epochs={this.state.epochs} 
                onChange={this.handleChange}
              />
              <ImagesField 
                className="imagesField" 
                minImages={this.state.minImages} 
                onChange={this.handleChange}
              />
            </div>
            <Divider style={{ marginTop: '30px' }} variant="middle" />
            <ModelProgress
              className="progress"
              handleStop={this.handleStop}
              postStopFlag={this.postStopFlag}
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

export default TrainModel;

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

// eslint-disable-next-line react/prefer-stateless-function
class ModelsForm extends Component {
  render() {
    const { className, modelSelected, handleChange, models } = this.props;
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
}

// eslint-disable-next-line react/prefer-stateless-function
class CollectionsForm extends Component {
  render() {
    const {
      className,
      annotationCollections,
      onChange,
      collections
    } = this.props;

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
            selected.map(collection => collection.name).join(', ') ||
            'Loading...'
          }
        >
          {collections.map(collection => (
            <MenuItem key={collection.id} value={collection}>
              <Checkbox
                checked={annotationCollections.indexOf(collection) > -1}
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
  constructor(props) {
    super(props);

    this.state = {
      epochs: undefined
    };
  }

  render() {
    const { className } = this.props;
    const { epochs } = this.state;

    return (
      <TextField
        margin="normal"
        className={className}
        name="epochs"
        label="Epochs"
        value={epochs}
        onChange={this.handleChange}
      />
    );
  }
}

class ImagesField extends Component {
  constructor(props) {
    super(props);

    this.state = {
      minImages: undefined
    };
  }

  render() {
    const { className } = this.props;
    const { minImages } = this.state;

    return (
      <TextField
        margin="normal"
        className={className}
        name="images"
        label="# of Images"
        value={minImages}
        onChange={this.handleChange}
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
    this.loadOptionInfo();
    this.loadExistingModels();
  };

  // Used to handle changes in the hyperparameters and in the select model
  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  handleChangeSwitch = event => {
    this.setState({
      [event.target.value]: event.target.checked
    });
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

  componentDidMount = async () => {
    await this.loadOptionInfo();
    await this.loadExistingModels();
    this.loadCollectionList();
  };

  loadOptionInfo = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const option = 'trainmodel';
    return axios
      .get(`/api/models/train/${option}`, config)
      .then(res => {
        const { info } = res.data[0];
        this.setState({
          modelSelected: info.modelSelected
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
    const { models, modelSelected, annotationCollections } = this.state;
    const localSelected = annotationCollections;
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
        this.setState({
          collections: res.data,
          annotationCollections: localSelected
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

  handleStop = () => {
    this.updateBackendInfo();
    this.postModelInstance('stop');
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
    this.setState({
      annotationCollections: value
    });
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
                checkboxSelect={this.checkboxSelect}
                onChange={this.handleChangeMultiple}
              />
              <EpochsField className="epochsField" />
              <ImagesField className="imagesField" />
            </div>
            <Divider style={{ marginTop: '30px' }} variant="middle" />
            <ModelProgress className="progress" handleStop={this.handleStop} />
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

import React, { Component } from 'react';
import axios from 'axios';
import TextField from '@material-ui/core/TextField';
import io from 'socket.io-client';
import Input from '@material-ui/core/Input';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import { FormControl } from '@material-ui/core';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';

import ModelProgress from './ModelProgress';
import VideoMetadata from '../Utilities/VideoMetadata';
import CollectionInfo from '../Utilities/CollectionInfo';

import './TrainModel.css';

class ModelsForm extends Component {
  render() {
    return (
      <FormControl component="fieldset" className={this.props.className}>
        <InputLabel shrink>Model</InputLabel>
        <Select
          name="modelSelected"
          value={this.props.modelSelected || 'Loading...'}
          onChange={this.props.handleChange}
        >
          {this.props.models.map(model => (
            <MenuItem key={model.name} value={model.name}>
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }
}

class CollectionsForm extends Component {
  render() {
    return (
      <FormControl component="fieldset" className={this.props.className}>
        <InputLabel shrink>Annotations</InputLabel>
        <Select
          multiple
          name="selectedAnnotations"
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
                {collection.validConcepts ? (
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    color="textSecondary"
                  >
                    {collection.validConcepts.concepts.join(', ')}
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
    return (
      <TextField
        margin="normal"
        className={this.props.className}
        name="epochs"
        label="Epochs"
        value={this.state.epochs}
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
    return (
      <TextField
        margin="normal"
        className={this.props.className}
        name="images"
        label="# of Images"
        value={this.state.minImages}
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
      selectedCollectionCounts: [
        { count: 0 },
        { count: 0 },
        { count: 0 },
        { count: 0 }
      ],
      minImages: 5000,
      epochs: 0,
      includeTracking: false,
      verifiedOnly: false,
      infoDialogOpen: false,
      activeStep: 0,
      openedVideo: null,
      socket,
      countsLoaded: false
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
          activeStep: info.activeStep,
          modelSelected: info.modelSelected,
          minImages: info.minImages,
          epochs: info.epochs
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

    return axios.get(
      `/api/collections/annotations?train=${selectedModelTuple.conceptsid}`, config).then(res => {
      this.setState({
        collections: res.data,
        annotationCollections: localSelected
      });
    });
  };

  getSteps = () => {
    return [
      'Select model',
      'Select annotation collection',
      'Select hyperparameters'
    ];
  };

  getStepContent = step => {
    switch (step) {
      case 0:
        return this.selectModel();
      case 1:
        return this.selectCollection();
      case 2:
        return this.selectHyperparameters();
      default:
        return 'Unknown step';
    }
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

  handleSelectAll = () => {
    const { activeStep } = this.state;

    const stateName = this.getStepState(activeStep);
    // eslint-disable-next-line react/destructuring-assignment
    const data = this.state[stateName];
    const dataSelected = JSON.parse(
      // eslint-disable-next-line react/destructuring-assignment, react/no-access-state-in-setstate
      JSON.stringify(this.state[`${stateName}Selected`])
    );
    data.forEach(row => {
      if (!dataSelected.includes(row.id)) {
        dataSelected.push(row.id);
      }
    });
    this.setState({
      [`${stateName}Selected`]: dataSelected
    });
  };

  handleUnselectAll = () => {
    const { activeStep } = this.state;

    const stateName = this.getStepState(activeStep);
    this.setState({
      [`${stateName}Selected`]: []
    });
  };

  getSelectedCount = () => {
    const {
      selectedCollectionCounts,
      includeTracking,
      verifiedOnly
    } = this.state;
    if (verifiedOnly) {
      let count = parseInt(selectedCollectionCounts[2].count, 10);
      if (includeTracking) {
        count += parseInt(selectedCollectionCounts[3].count, 10);
      }
      return count;
    }
    let count = parseInt(selectedCollectionCounts[0].count, 10);
    if (includeTracking) {
      count += parseInt(selectedCollectionCounts[1].count, 10);
    }
    return count;
  };

  handleStop = () => {
    this.setState(
      {
        activeStep: 0
      },
      () => {
        this.updateBackendInfo();
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
    return (
      <div className="root">
        <Paper square>
          <div className="container">
            <div className="actionsContainer">
              <ModelsForm
                className="modelsForm"
                modelSelected={this.state.modelSelected}
                handleChange={this.handleChange}
                models={this.state.models}
              />
              <CollectionsForm
                className="collectionsForm"
                collections={this.state.collections}
                annotationCollections={this.state.annotationCollections}
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
        {this.state.openedVideo && (
          <VideoMetadata
            open
            handleClose={this.closeVideoMetadata}
            openedVideo={this.state.openedVideo}
            socket={this.props.socket}
            loadVideos={this.props.loadVideos}
            modelTab
          />
        )}
      </div>
    );
  }
}

export default TrainModel;

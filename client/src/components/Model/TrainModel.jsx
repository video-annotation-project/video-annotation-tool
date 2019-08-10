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
  root: {
    margin: '40px 180px'
  },
  form: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(),
    minWidth: 150
  },
  group: {
    marginLeft: 15
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    padding: '20px',
    height: '560px'
  },
  stepper: {
    display: 'block',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'left',
    width: '50%'
  },
  progress: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'right',
    alignItems: 'right',
    width: '50%'
  },
  button: {
    marginTop: theme.spacing(4),
    marginRight: theme.spacing()
  },
  infoButton: {
    marginTop: theme.spacing(2)
  },
  actionsContainer: {
    flexDirection: 'column',
    justifyContent: 'left',
    marginBottom: theme.spacing(2)
  },
  resetContainer: {
    padding: theme.spacing(3)
  },
  checkSelector: {
    marginTop: theme.spacing(),
    maxHeight: '250px',
    overflow: 'auto'
  },
  videoSelector: {
    width: '625px'
  },
  textField: {
    width: 200
  },
  epochText: {
    position: 'relative',
    top: '-15px'
  },
  hyperParamsInput: {
    width: '208px',
    marginRight: '10px'
  },
  info: {
    marginTop: theme.spacing(2)
  }
});

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
    const { className, getImageRange } = this.props;
    const { minImages } = this.state;

    return (
      <TextField
        margin="normal"
        className={className}
        name="images"
        label="# of Images"
        value={minImages}
        onChange={this.handleChange}
        helperText={getImageRange()}
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
      selectedCollectionCounts: [],
      minCounts: [],
      includeTracking: false,
      verifiedOnly: false,
      infoDialogOpen: false,
      openedVideo: null
    };
  }

  componentDidMount = async () => {
    await this.loadOptionInfo();
    await this.loadExistingModels();
    this.loadCollectionList();
  };

  // Used to handle changes in the hyperparameters and in the select model
  handleChange = event => {
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
        const modelConcepts = selectedModelTuple.conceptsid;
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
    this.setState(
      {
        annotationCollections: value
      },
      () => {
        this.getCollectionCounts();
      }
    );
  };

  getImageRange = () => {
    const { minCounts, includeTracking, verifiedOnly } = this.state;
    if (!minCounts.length) return '';

    let selection;
    if (verifiedOnly) {
      if (includeTracking) {
        selection = 3;
      } else {
        selection = 2;
      }
    } else if (includeTracking) {
      selection = 1;
    } else {
      selection = 0;
    }

    return minCounts[selection] === 1
      ? `Must be 1`
      : `Must be 1–${minCounts[selection]}`;
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
                parseInt(count.verified_user, 10) +
                parseInt(count.verified_tracking, 10)
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
              <EpochsField className="epochsField" />
              <ImagesField
                className="imagesField"
                getImageRange={this.getImageRange}
              />
            </div>
            {annotationCollections.length ? (
              <React.Fragment>
                <Button
                  variant="outlined"
                  color="primary"
                  className={classes.infoButton}
                  onClick={this.toggleInfo}
                >
                  Training Info
                </Button>
                <div>
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
              </React.Fragment>
            ) : (
              ''
            )}
            <CollectionInfo
              open={infoDialogOpen}
              onClose={this.toggleInfo}
              counts={selectedCollectionCounts}
            />
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

export default withStyles(styles)(TrainModel);

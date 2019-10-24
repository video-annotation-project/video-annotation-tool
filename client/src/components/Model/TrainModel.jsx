import React, { Component } from 'react';
import axios from 'axios';
import TextField from '@material-ui/core/TextField';
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
import Dialog from '@material-ui/core/Dialog';

import ModelProgress from '../OldModel/ModelProgress';
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
  },
  paper: {
    minHeight: 'calc(100vh - 130px)'
  }
});

const paramFields = [
  'epochs',
  'minImages',
  'annotationCollections',
  'includeTracking',
  'verifiedOnly'
];

function CollectionsForm(props) {
  const {
    className,
    annotationCollections,
    onChange,
    collections,
    training
  } = props;
  return (
    <FormControl component="fieldset" className={className}>
      <InputLabel shrink>Annotations</InputLabel>
      <Select
        multiple
        name="selectedAnnotations"
        value={annotationCollections}
        onChange={onChange}
        input={<Input id="select-multiple" />}
        disabled={training}
        renderValue={selected => 
          selected.map(collection => collection.name).join(', ') || 'Loading...'
        }
      >
        {collections.map(collection => (
          <MenuItem
            key={collection.id}
            value={collection}
          >
            <Checkbox
              checked={annotationCollections.indexOf(collection) > -1}
            />
            <ListItemText>
              {collection.name}
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function EpochsField(props) {
  const { className, epochs, onChange, training } = props;
  return (
    <TextField
      margin="normal"
      className={className}
      name="epochs"
      label="Epochs"
      value={epochs}
      onChange={onChange}
      disabled={training}
    />
  );
}

function ImagesField(props) {
  const { className, minImages, onChange, training } = props;

  return (
    <TextField
      margin="normal"
      className={className}
      name="minImages"
      label="# of Images"
      value={minImages}
      onChange={onChange}
      disabled={training}
    />
  );
}

class TrainModel extends Component {
  constructor(props) {
    super(props);

    this.state = {
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
      ready: false,
      training: false
    };
  }

  componentDidMount = async () => {
    const { trainOpen } = this.props;
    if (trainOpen) {
      await this.loadCollectionList();
      this.loadModelParams();
    }
  };

  loadCollectionList = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    return axios
      .get(`/api/collections/annotations?train=true`, config)
      .then(res => {
        this.setState({
          collections: res.data,
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
    this.setState({
      [event.target.name]: event.target.value
    });
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

  loadModelParams = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    try {
      axios.get(`/api/models/progress/train`, config).then(progressRes => {
        const training = progressRes.data.status !== 0;

        if (training) {
          axios.get(`/api/models/train`, config).then(res => {
            const params = res.data;

            const annotationCollections = params.annotation_collections.map(
              id => this.state.collections.find(coll => coll.id === id)
            );

            console.log(this.state.collections);

            this.setState(
              {
                annotationCollections: annotationCollections,
                includeTracking: params.include_tracking,
                verifiedOnly: params.verified_only,
                epochs: params.epochs,
                minImages: params.min_images,
                training: true
              },
              () => this.getCollectionCounts()
            );
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  };

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
      collection.concepts.forEach(concept => {
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
      axios
        .patch('/api/models/train/stop', {}, config)
        .then(res => this.setState({ training: false }));
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

      axios
        .patch('/api/models/train/reset', {}, config)
        .then(res => this.setState({ training: false }));
    } catch (error) {
      console.log(error);
    }
  };

  updateModelParams = async () => {
    const { model } = this.props;
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    const {
      epochs,
      minImages,
      annotationCollections,
      verifiedOnly,
      includeTracking
    } = this.state;

    const body = {
      epochs,
      minImages,
      includeTracking,
      verifiedOnly,
      modelSelected: model.name,
      annotationCollections: annotationCollections.map(c => c.id),
      version: model.version_selected
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
    const { classes, toggleStateVariable, trainOpen, model } = this.props;
    const {
      collections,
      annotationCollections,
      infoDialogOpen,
      selectedCollectionCounts,
      includeTracking,
      verifiedOnly,
      epochs,
      minImages,
      minCounts,
      training
    } = this.state;

    return (
      <Dialog
        fullWidth={true}
        maxWidth="md"
        className={classes.root}
        open={trainOpen}
        onClose={() => toggleStateVariable(false, 'trainOpen')}
      >
        <Paper className={classes.paper}>
          <div className="container">
            <div className="actionsContainer">
              <div>
                <Typography align="left" variant="h4">
                  {model.name}
                </Typography>
                <Typography align="left" variant="caption">
                  Version: {model.version_selected}
                </Typography>
              </div>
              <CollectionsForm
                className="collectionsForm"
                collections={collections}
                annotationCollections={annotationCollections}
                onChange={this.handleChangeMultiple}
                training={training}
              />
              <EpochsField
                className="epochsField"
                epochs={epochs}
                onChange={this.handleChange}
                training={training}
              />
              <ImagesField
                className="imagesField"
                minImages={minImages}
                onChange={this.handleChange}
                training={training}
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
                        disabled={training}
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
                        disabled={!minCounts[2] || training}
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
            {trainOpen ? (
              <ModelProgress
                className="progress"
                postStopFlag={this.postStopFlag}
                startTraining={this.startTraining}
                stopTraining={this.stopTraining}
                resetTraining={this.resetTraining}
                terminateTraining={() => this.postModelInstance('stop')}
                checkReady={this.checkReady}
              />
            ) : (
              ''
            )}
          </div>
        </Paper>
      </Dialog>
    );
  }
}

export default withStyles(styles)(TrainModel);

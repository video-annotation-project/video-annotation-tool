import React, { Component } from 'react';
import axios from 'axios';
import TextField from '@material-ui/core/TextField';
import io from 'socket.io-client';
import { withStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
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
import Switch from '@material-ui/core/Switch';

import ModelProgress from './ModelProgress';
import VideoMetadata from '../Utilities/VideoMetadata';

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
    marginTop: theme.spacing(2),
    marginRight: theme.spacing()
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
  hyperparametersForm: {
    display: 'flex',
    flexWrap: 'wrap'
  },
  textField: {
    width: 200
  },
  epochText: {
    position: 'relative',
    top: '-15px'
  },
  hyperParamsInput: {
    width: '200px',
    marginRight: '10px'
  },
  info: {
    marginTop: theme.spacing(2)
  }
});

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

  updateBackendInfo = () => {
    const {
      activeStep,
      modelSelected,
      annotationCollections,
      epochs,
      minImages,
      socket
    } = this.state;

    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const info = {
      activeStep,
      modelSelected,
      annotationCollections,
      epochs,
      minImages
    };
    const body = {
      info: JSON.stringify(info)
    };
    // update SQL database
    axios
      .put('/api/models/train/trainmodel/', body, config)
      .then(() => {
        socket.emit('refresh trainmodel');
      })
      .catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
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

  loadOptionInfo = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const option = 'trainmodel';
    axios
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
    axios
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
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios.get(`/api/collections/annotations?train=true`, config).then(res => {
      const selectedModelTuple = models.find(model => {
        return model.name === modelSelected;
      });
      const modelConcepts = selectedModelTuple.conceptsid;
      res.data.forEach(col => {
        const filtered = modelConcepts.filter(x => col.ids.includes(x));
        if (filtered.length > 0) {
          col.disable = false;
          col.validConcepts = col.concepts.filter(y => filtered.includes(y.f2));
        } else {
          const indexOfThis = localSelected.indexOf(col.id);
          if (indexOfThis > -1) {
            localSelected.splice(indexOfThis, 1);
          }
          col.disable = true;
        }
      });
      this.setState({
        collections: res.data.sort(a => (a.validConcepts ? -1 : 1)),
        annotationCollections: localSelected
      });
      // this.filterCollection(selectedModelTuple, res.data);
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

  selectModel = () => {
    const { classes } = this.props;
    const { modelSelected, models } = this.state;
    if (modelSelected === null) {
      return <div>Loading...</div>;
    }
    return (
      <FormControl className={classes.form}>
        <InputLabel>Select Model</InputLabel>
        <Select
          name="modelSelected"
          value={modelSelected}
          onChange={this.handleChange}
        >
          {models.map(model => (
            <MenuItem key={model.name} value={model.name}>
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
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

  selectCollection = () => {
    const { classes } = this.props;
    const { annotationCollections, collections } = this.state;

    if (!annotationCollections) {
      return <div>Loading...</div>;
    }
    return (
      <FormControl component="fieldset" className={classes.checkSelector}>
        <FormGroup className={classes.group}>
          {collections.map(collection => (
            <div key={collection.id}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={this.checkboxSelect(
                      'annotationCollections',
                      annotationCollections,
                      collection.id
                    )}
                    color="primary"
                    checked={annotationCollections.includes(collection.id)}
                    disabled={collection.disable}
                  />
                }
                label={
                  <div>
                    {collection.name}
                    {collection.validConcepts ? (
                      <Typography
                        variant="subtitle2"
                        gutterBottom
                        color="secondary"
                      >
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
                  </div>
                }
              />
            </div>
          ))}
        </FormGroup>
      </FormControl>
    );
  };

  selectHyperparameters = () => {
    const { classes } = this.props;
    const {
      epochs,
      minImages,
      includeTracking,
      verifiedOnly,
      selectedCollectionCounts,
      countsLoaded
    } = this.state;

    return (
      <form className={classes.hyperparametersForm}>
        <TextField
          margin="normal"
          name="epochs"
          label="Number of epochs"
          type="number"
          value={epochs}
          onChange={this.handleChange}
          className={classes.hyperParamsInput}
          helperText="0 = Until Increased Loss"
        />
        <TextField
          margin="normal"
          name="minImages"
          label="Number of training images"
          type="number"
          value={minImages}
          onChange={this.handleChange}
          className={classes.hyperParamsInput}
        />
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
              />
            }
            label="Verified annotations only"
          />
        </div>
        <div className={classes.info}>
          {countsLoaded ? (
            <React.Fragment>
              <Typography variant="subtitle1">
                User Annotations: {selectedCollectionCounts[0].count}
              </Typography>
              <Typography variant="subtitle1">
                Tracking Annotations: {selectedCollectionCounts[1].count}
              </Typography>
              <Typography variant="subtitle1">
                Verified User Annotations: {selectedCollectionCounts[2].count}
              </Typography>
              <Typography variant="subtitle1">
                Verified Tracking Annotations:{' '}
                {selectedCollectionCounts[3].count}
              </Typography>
            </React.Fragment>
          ) : (
            <Typography>Loading...</Typography>
          )}
        </div>
      </form>
    );
  };

  getCollectionCounts = async () => {
    const { annotationCollections } = this.state;
    try {
      const res = await axios.get(`/api/collections/annotations/counts`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          ids: annotationCollections
        }
      });
      if (res) {
        this.setState({
          countsLoaded: true,
          selectedCollectionCounts: res.data
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  handleNext = async () => {
    const { activeStep } = this.state;
    // After users have been selected load user videos
    if (activeStep === 0) {
      this.loadCollectionList();
    }

    if (activeStep === 1) {
      this.getCollectionCounts();
    }
    // After Model and videos have been selected load available concepts
    // if (this.state.activeStep === 2) {
    //   await this.loadConceptList();
    // }
    this.setState(
      state => ({
        activeStep: state.activeStep + 1
      }),
      () => {
        if (activeStep === 3) {
          this.postModelInstance('start');
        }
        this.updateBackendInfo();
      }
    );
  };

  handleBack = () => {
    this.setState(
      state => ({
        activeStep: state.activeStep - 1
      }),
      () => {
        this.updateBackendInfo();
      }
    );
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

  render() {
    const { classes, socket, loadVideos } = this.props;
    const {
      annotationCollections,
      modelSelected,
      activeStep,
      openedVideo
    } = this.state;

    const steps = this.getSteps();

    return (
      <div className={classes.root}>
        <Paper square>
          <div className={classes.container}>
            <Stepper
              className={classes.stepper}
              activeStep={activeStep}
              orientation="vertical"
            >
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                  <StepContent>
                    {this.getStepContent(index)}
                    <div className={classes.actionsContainer}>
                      <Button
                        variant="contained"
                        disabled={activeStep === 0}
                        onClick={this.handleBack}
                        className={classes.button}
                      >
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleNext}
                        className={classes.button}
                        disabled={
                          (activeStep === 0 && modelSelected === '') ||
                          (activeStep === 1 && annotationCollections.length < 1)
                        }
                      >
                        {activeStep === steps.length - 1
                          ? 'Train Model'
                          : 'Next'}
                      </Button>
                    </div>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
            <ModelProgress
              className={classes.progress}
              activeStep={activeStep}
              steps={steps}
              handleStop={this.handleStop}
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

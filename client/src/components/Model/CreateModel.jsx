import React, { Component } from 'react';
import axios from 'axios';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import { FormControl, Grid } from '@material-ui/core';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Swal from 'sweetalert2/src/sweetalert2';
import ListItem from '@material-ui/core/ListItem';
import Tooltip from '@material-ui/core/Tooltip';
import List from '@material-ui/core/List';
import IconButton from '@material-ui/core/IconButton';
import Description from '@material-ui/icons/Description';
import Dialog from '@material-ui/core/Dialog';

import VideoMetadata from '../Utilities/VideoMetadata';

const styles = theme => ({
  checkSelector: {
    marginTop: theme.spacing(2),
    maxHeight: '300px',
    overflow: 'auto'
  },
  list: {
    marginTop: theme.spacing(2),
    overflow: 'auto',
    maxHeight: `${350 - theme.spacing(2)}px`
  },
  textField: {
    marginLeft: theme.spacing(),
    marginRight: theme.spacing(),
    width: 200
  },
  actionsContainer: {
    marginBottom: theme.spacing(2)
  },
  button: {
    marginTop: theme.spacing(3),
    marginRight: theme.spacing()
  },
  collectionButton: {
    textTransform: 'none'
  },
  resetContainer: {
    padding: theme.spacing(3)
  },
  modelNameForm: {
    display: 'flex',
    flexWrap: 'wrap'
  },
  group: {
    marginLeft: 15
  },
  grid: {
    margin: theme.spacing(6)
  }
});

class CreateModel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modelName: '',
      models: [],
      concepts: [],
      conceptsSelected: [],
      conceptCollections: [],
      conceptCollectionsSelected: [],
      videos: [],
      videoCollections: [],
      videosSelected: [],
      activeStep: 0,
      openedVideo: null
    };
  }

  getSteps = () => {
    return ['Name model', 'Select concepts', 'Select test videos'];
  };

  getStepContent = step => {
    switch (step) {
      case 0:
        return this.nameModel();
      case 1:
        return this.selectConcepts();
      case 2:
        return this.selectVideo();
      default:
        return 'Unknown step';
    }
  };

  componentDidMount = () => {
    this.loadConcepts();
    this.loadConceptCollections();
    this.loadVideoList();
    this.loadVideoCollections();
  };

  loadConcepts = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .get(`/api/models/concepts`, config)
      .then(res => {
        this.setState({
          concepts: res.data
        });
      })
      .catch(error => {
        console.log('Error in get /api/concepts');
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  loadConceptCollections = async () => {
    return axios
      .get(`/api/collections/concepts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        this.setState({
          conceptCollections: res.data
        });
      })
      .catch(error => {
        console.log(error);
      });
  };

  loadVideoList = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios.get(`/api/videos`, config).then(res => {
      this.setState({
        videos: res.data.watchedVideos
      });
    });
  };

  loadVideoCollections = async () => {
    return axios
      .get(`/api/collections/videos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        this.setState({
          videoCollections: res.data
        });
      })
      .catch(error => {
        console.log(error);
      });
  };

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  handleChangeCollection = type => value => {
    this.setState({
      [type]: value
    });
  };

  nameModel = () => {
    const { classes } = this.props;
    const { modelName } = this.state;

    return (
      <form className={classes.modelNameForm} onSubmit={this.handleNext}>
        <TextField
          margin="normal"
          name="modelName"
          label="Model Name"
          value={modelName}
          onChange={this.handleChange}
          autoFocus
        />
      </form>
    );
  };

  selectCollectionConcepts = id => {
    const { conceptsSelected, conceptCollections} = this.state;
    let conceptids = JSON.parse(JSON.stringify(conceptsSelected));

    const conceptCollection = conceptCollections.find(x => x.id === id);

    if (conceptCollection.conceptids[0]) {
      conceptCollection.conceptids.forEach(id => {
        if (!conceptids.includes(id)) conceptids.push(id);
      })

      this.handleChangeCollection('conceptsSelected')(
        conceptids
      );
    }
  }

  // Handle concept checkbox selections
  checkboxSelect = (stateName, stateValue, id) => event => {
    let deepCopy = JSON.parse(JSON.stringify(stateValue));

    if (stateName === "conceptCollectionsSelected") this.selectCollectionConcepts(id);

    if (event.target.checked) {
      deepCopy.push(id);
    } else {
      deepCopy = deepCopy.filter(user => user !== id);
    }
    this.setState({
      [stateName]: deepCopy
    });
  };

  checkDisjointCollection = id => {
    const { conceptsSelected, conceptCollections, conceptCollectionsSelected } = this.state;
    const conceptCollection = conceptCollections.find(x => x.id === id);
    let disabled = false;

    if (!conceptCollectionsSelected.includes(id)) {
      conceptCollection.conceptids.forEach(conceptid => {
        if (conceptsSelected.includes(conceptid)) {
          disabled = true;
        }
      })
    }

    return disabled;
  }

  selectConcepts = () => {
    const { classes } = this.props;
    const { concepts, conceptsSelected, conceptCollections, conceptCollectionsSelected } = this.state;
    if (!concepts) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    return (
      <Grid container spacing={5}>
        <Grid item>
          <FormLabel component="legend">Select species to train with</FormLabel>
          <FormControl component="fieldset" className={classes.checkSelector}>
            <FormGroup className={classes.group}>
              {concepts
                .filter(concept => concept.rank)
                .map(concept => (
                  <div key={concept.name}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          onChange={this.checkboxSelect(
                            'conceptsSelected',
                            conceptsSelected,
                            concept.id
                          )}
                          color="primary"
                          checked={conceptsSelected.includes(concept.id)}
                        />
                      }
                      label={`${concept.id} ${concept.name}`}
                    />
                  </div>
                ))}
            </FormGroup>
          </FormControl>
        </Grid>
        <Grid item>
          <FormLabel component="legend">
            Select species collection to test model
          </FormLabel>
          <List className={classes.list}>
            {conceptCollections.map(conceptCollection => (
              <div key={conceptCollection.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      onChange={this.checkboxSelect(
                        'conceptCollectionsSelected',
                        conceptCollectionsSelected,
                        conceptCollection.id
                      )}
                      color="primary"
                      checked={conceptCollectionsSelected.includes(conceptCollection.id)}
                      disabled={this.checkDisjointCollection(conceptCollection.id)}
                    />
                  }
                  label={`${conceptCollection.name}`}
                />
              </div>
            ))}
          </List>
        </Grid>
      </Grid>
    );
  };

  handleSelectAll = (data, dataSelected, stepInfo) => {
    const selected = dataSelected;
    data.forEach(row => {
      if (row.id) {
        if (!selected.includes(row.id)) {
          selected.push(row.id);
        }
      }
    });
    this.setState({
      [stepInfo]: selected
    });
  };

  handleUnselectAll = stepInfo => {
    this.setState({
      [stepInfo]: []
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

  selectVideo = () => {
    const { classes } = this.props;
    const { videos, videosSelected, videoCollections } = this.state;

    if (!videos) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    return (
      <Grid container spacing={5}>
        <Grid item>
          <FormLabel component="legend">Select videos to test model</FormLabel>
          <div>
            <Button
              className={classes.button}
              color="primary"
              onClick={() => {
                this.handleSelectAll(videos, videosSelected, 'videosSelected');
              }}
            >
              Select All
            </Button>
            <Button
              className={classes.button}
              color="primary"
              onClick={() => {
                this.handleUnselectAll('videosSelected');
              }}
            >
              Unselect All
            </Button>
          </div>
          <FormControl component="fieldset" className={classes.checkSelector}>
            <FormGroup className={classes.group}>
              {videos.map(video => (
                <div key={video.filename}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        onChange={this.checkboxSelect(
                          'videosSelected',
                          videosSelected,
                          video.id
                        )}
                        color="primary"
                        checked={videosSelected.includes(video.id)}
                      />
                    }
                    label={`${video.id} ${video.filename}`}
                  />
                  <IconButton
                    onClick={event => this.openVideoMetadata(event, video)}
                    style={{ float: 'right' }}
                  >
                    <Description />
                  </IconButton>
                </div>
              ))}
            </FormGroup>
          </FormControl>
        </Grid>
        <Grid item>
          <FormLabel component="legend">
            Select video collections to test model
          </FormLabel>
          <List className={classes.list}>
            {videoCollections.map(videoCollection => (
              <ListItem key={videoCollection.id}>
                <Tooltip
                  title={
                    !videoCollection.description
                      ? ''
                      : videoCollection.description
                  }
                  placement="bottom-start"
                >
                  <div>
                    <Button
                      className={classes.collectionButton}
                      variant="outlined"
                      value={videoCollection.id}
                      disabled={!videoCollection.videoids[0]}
                      onClick={() => {
                        if (videoCollection.videoids[0]) {
                          const videoids = [];
                          videos.forEach(video => {
                            if (videoCollection.videoids.includes(video.id)) {
                              videoids.push(video.id);
                            }
                          });
                          this.handleChangeCollection('videosSelected')(
                            videoids
                          );
                        }
                      }}
                    >
                      {videoCollection.name +
                        (!videoCollection.videoids[0] ? ' (No Videos)' : '')}
                    </Button>
                  </div>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    );
  };

  postModel = async () => {
    const { loadExistingModels } = this.props;
    const { modelName, conceptsSelected, conceptCollectionsSelected, videosSelected } = this.state;
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      name: modelName,
      concepts: conceptsSelected,
      concept_collections: conceptCollectionsSelected,
      videos: videosSelected
    };
    try {
      await axios.post(`/api/models`, body, config);
      loadExistingModels();
    } catch (error) {
      console.log('Error in post /api/models');
      if (error.response) {
        Swal.fire(error.response.data.detail, '', 'error');
      }
    }
  };

  handleNext = event => {
    const { toggleStateVariable } = this.props;
    const { activeStep, models, modelName } = this.state;

    event.preventDefault();
    // If step = 0 then need to check
    // If model name exists
    if (activeStep === 0) {
      if (models.includes(modelName)) {
        Swal.fire('Model Already Exists', '', 'info');
        return;
      }
    }
    // If step = 2 then model ready to submit
    if (activeStep === 2) {
      this.postModel();
      toggleStateVariable(false, 'createOpen');
    }

    this.setState(state => ({
      activeStep: state.activeStep + 1
    }));
  };

  handleBack = () => {
    this.setState(state => ({
      activeStep: state.activeStep - 1
    }));
  };

  handleReset = () => {
    this.setState({
      activeStep: 0,
      modelName: '',
      conceptsSelected: []
    });
  };

  render() {
    const {
      classes,
      socket,
      loadVideos,
      createOpen,
      toggleStateVariable
    } = this.props;
    const steps = this.getSteps();
    const {
      models,
      activeStep,
      modelName,
      conceptsSelected,
      videosSelected,
      openedVideo
    } = this.state;
    if (!models) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    return (
      <Dialog
        className={classes.root}
        open={createOpen}
        onClose={() => toggleStateVariable(false, 'createOpen')}
      >
        <Stepper
          activeStep={activeStep}
          style={{ backgroundColor: 'transparent' }}
        >
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Grid container justify="center">
          <Grid item className={classes.grid}>
            {this.getStepContent(activeStep)}
          </Grid>
        </Grid>
        <Grid container justify="center">
          <Grid item>
            <div className={classes.actionsContainer}>
              <div>
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
                    (activeStep === 0 && modelName === '') ||
                    (activeStep === 1 && conceptsSelected.length < 1) ||
                    (activeStep === 2 && videosSelected.length < 1)
                  }
                >
                  {activeStep === steps.length - 1 ? 'Create Model' : 'Next'}
                </Button>
              </div>
            </div>
          </Grid>
        </Grid>
        {activeStep === steps.length && (
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography>Model has been created...</Typography>
            <Button onClick={this.handleReset} className={classes.button}>
              Another One...
            </Button>
          </Paper>
        )}
        {openedVideo && (
          <VideoMetadata
            /* 
              The VideoMetadata 'openness' is controlled through
              boolean logic rather than by passing in a variable as an
              attribute. This is to force VideoMetadata to unmount when it 
              closes so that its state is reset. This also prevents the 
              accidental double submission bug, by implicitly reducing 
              the transition time of VideoMetadata to zero. 
            */
            open
            handleClose={this.closeVideoMetadata}
            openedVideo={openedVideo}
            socket={socket}
            loadVideos={loadVideos}
            modelTab
          />
        )}
      </Dialog>
    );
  }
}

export default withStyles(styles)(CreateModel);

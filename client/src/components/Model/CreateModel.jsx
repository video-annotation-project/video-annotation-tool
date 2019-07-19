import React, { Component } from "react";
import axios from "axios";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import StepContent from "@material-ui/core/StepContent";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import { FormControl, Grid } from "@material-ui/core";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Checkbox from "@material-ui/core/Checkbox";

//Video description
import IconButton from "@material-ui/core/IconButton";
import Description from "@material-ui/icons/Description";
import VideoMetadata from "../Utilities/VideoMetadata.jsx";

import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import Swal from "sweetalert2";
import ListItem from "@material-ui/core/ListItem";
import Tooltip from "@material-ui/core/Tooltip";
import List from "@material-ui/core/List";

const styles = theme => ({
  checkSelector: {
    marginTop: theme.spacing(2),
    maxHeight: "400px",
    overflow: "auto"
  },
  list: {
    marginTop: theme.spacing(2),
    overflow: "auto",
    maxHeight: (400 - theme.spacing(2)).toString() + "px"
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
    marginTop: theme.spacing(2),
    marginRight: theme.spacing()
  },
  collectionButton: {
    textTransform: "none"
  },
  resetContainer: {
    padding: theme.spacing(3)
  },
  ModelNameForm: {
    display: "flex",
    flexWrap: "wrap"
  },
  group: {
    marginLeft: 15
  }
});

class CreateModel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modelName: "",
      models: [],
      concepts: [],
      conceptCollections: [],
      conceptsSelected: [],
      videos: [],
      videoCollections: [],
      videosSelected: [],
      activeStep: 0,
      openedVideo: null
    };
  }

  getSteps = () => {
    return ["Name model", "Select species", "Select test videos"];
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
        return "Unknown step";
    }
  };

  componentDidMount = () => {
    this.loadExistingModels();
    this.loadConcepts();
    this.loadConceptCollections();
    this.loadVideoList();
    this.loadVideoCollections();
  };

  loadExistingModels = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .get(`/api/models`, config)
      .then(res => {
        let models = [];
        res.data.forEach(model => {
          models.push(model.name);
        });
        this.setState({
          models: models
        });
      })
      .catch(error => {
        console.log("Error in get /api/models");
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  loadConcepts = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
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
        console.log("Error in get /api/concepts");
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  loadConceptCollections = async () => {
    return axios
      .get(`/api/collections/concepts`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      })
      .then(res => {
        this.setState({
          conceptCollections: res.data
        });
      })
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  loadVideoList = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
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
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      })
      .then(res => {
        this.setState({
          videoCollections: res.data
        });
      })
      .catch(error => {
        this.setState({
          error: error
        });
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
    const classes = this.props.classes;
    return (
      <form className={classes.ModelNameForm} onSubmit={this.handleNext}>
        <TextField
          margin="normal"
          name="modelName"
          label="Model Name"
          value={this.state.modelName}
          onChange={this.handleChange}
          autoFocus={true}
        />
      </form>
    );
  };

  //Handle concept checkbox selections
  checkboxSelect = (stateName, id) => event => {
    let deepCopy = JSON.parse(JSON.stringify(this.state[stateName]));
    if (event.target.checked) {
      deepCopy.push(id);
    } else {
      deepCopy = deepCopy.filter(user => user !== id);
    }
    this.setState({
      [stateName]: deepCopy
    });
  };

  selectConcepts = () => {
    const classes = this.props.classes;
    if (!this.state.concepts) {
      return <div>Loading...</div>;
    }
    return (
      <Grid container spacing={5}>
        <Grid item>
          <FormLabel component="legend">Select species to train with</FormLabel>
          <FormControl component="fieldset" className={classes.checkSelector}>
            <FormGroup className={classes.group}>
              {this.state.concepts
                .filter(concept => concept.rank)
                .map(concept => (
                  <div key={concept.name}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          onChange={this.checkboxSelect(
                            "conceptsSelected",
                            concept.id
                          )}
                          color="primary"
                          checked={this.state.conceptsSelected.includes(
                            concept.id
                          )}
                        />
                      }
                      label={concept.id + " " + concept.name}
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
            {this.state.conceptCollections.map(conceptCollection => (
              <ListItem key={conceptCollection.id}>
                <Tooltip
                  title={
                    !conceptCollection.description
                      ? ""
                      : conceptCollection.description
                  }
                  placement="bottom-start"
                >
                  <div>
                    <Button
                      className={classes.collectionButton}
                      variant="outlined"
                      value={conceptCollection.id}
                      disabled={!conceptCollection.conceptids[0]}
                      onClick={() => {
                        if (conceptCollection.conceptids[0]) {
                          let conceptids = [];
                          this.state.concepts.forEach(concept => {
                            if (
                              conceptCollection.conceptids.includes(concept.id)
                            ) {
                              conceptids.push(concept.id);
                            }
                          });
                          this.handleChangeCollection("conceptsSelected")(
                            conceptids
                          );
                        }
                      }}
                    >
                      {conceptCollection.name +
                        (!conceptCollection.conceptids[0]
                          ? " (No concepts)"
                          : "")}
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

  //Methods for video meta data
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
    const classes = this.props.classes;

    if (!this.state.videos) {
      return <div>Loading...</div>;
    }
    return (
      <Grid container spacing={5}>
        <Grid item>
          <FormLabel component="legend">Select videos to test model</FormLabel>
          <FormControl
            component="fieldset"
            className={this.props.classes.checkSelector}
          >
            <FormGroup className={classes.group}>
              {this.state.videos.map(video => (
                <div key={video.filename}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        onChange={this.checkboxSelect(
                          "videosSelected",
                          video.id
                        )}
                        color="primary"
                        checked={this.state.videosSelected.includes(video.id)}
                      />
                    }
                    label={video.id + " " + video.filename}
                  />
                  <IconButton
                    onClick={event => this.openVideoMetadata(event, video)}
                    style={{ float: "right" }}
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
            {this.state.videoCollections.map(videoCollection => (
              <ListItem key={videoCollection.id}>
                <Tooltip
                  title={
                    !videoCollection.description
                      ? ""
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
                          let videoids = [];
                          this.state.videos.forEach(video => {
                            if (videoCollection.videoids.includes(video.id)) {
                              videoids.push(video.id);
                            }
                          });
                          this.handleChangeCollection("videosSelected")(
                            videoids
                          );
                        }
                      }}
                    >
                      {videoCollection.name +
                        (!videoCollection.videoids[0] ? " (No Videos)" : "")}
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
    const { modelName, conceptsSelected, videosSelected } = this.state;
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      name: modelName,
      concepts: conceptsSelected,
      videos: videosSelected
    };
    try {
      await axios.post(`/api/models`, body, config);
      this.loadExistingModels();
    } catch (error) {
      console.log("Error in post /api/models");
      if (error.response) {
        Swal.fire(error.response.data.detail, "", "error");
      }
    }
  };

  handleNext = event => {
    event.preventDefault();
    // If step = 0 then need to check
    // If model name exists
    if (this.state.activeStep === 0) {
      if (this.state.models.includes(this.state.modelName)) {
        Swal.fire("Model Already Exists", "", "info");
        return;
      }
    }
    // If step = 2 then model ready to submit
    if (this.state.activeStep === 2) {
      this.postModel();
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
      modelName: "",
      conceptsSelected: []
    });
  };

  render() {
    const { classes } = this.props;
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
      return <div>Loading...</div>;
    }
    return (
      <div className={classes.root}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {this.getStepContent(index)}
                <div className={classes.actionsContainer}>
                  <div>
                    <Button
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
                        (activeStep === 0 && modelName === "") ||
                        (activeStep === 1 && conceptsSelected.length < 1) ||
                        (activeStep === 2 && videosSelected.length < 1)
                      }
                    >
                      {activeStep === steps.length - 1
                        ? "Create Model"
                        : "Next"}
                    </Button>
                  </div>
                </div>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === steps.length && (
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography>Model has been created...</Typography>
            <Button onClick={this.handleReset} className={classes.button}>
              Another One...
            </Button>
          </Paper>
        )}
        {this.state.openedVideo && (
          <VideoMetadata
            open={
              true /* The VideoMetadata 'openness' is controlled through
              boolean logic rather than by passing in a variable as an
              attribute. This is to force VideoMetadata to unmount when it 
              closes so that its state is reset. This also prevents the 
              accidental double submission bug, by implicitly reducing 
              the transition time of VideoMetadata to zero. */
            }
            handleClose={this.closeVideoMetadata}
            openedVideo={openedVideo}
            socket={this.props.socket}
            loadVideos={this.props.loadVideos}
            modelTab={true}
          />
        )}
      </div>
    );
  }
}

export default withStyles(styles)(CreateModel);

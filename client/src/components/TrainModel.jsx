import React, { Component } from "react";
import axios from "axios";

import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";

//Steppers for choosing model and videos
import PropTypes from "prop-types";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import StepContent from "@material-ui/core/StepContent";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";

//Display progress circle
import CircularProgress from "@material-ui/core/CircularProgress";

//Select Model
import { FormControl } from "@material-ui/core";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";

//Select Video
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Checkbox from "@material-ui/core/Checkbox";

//Video description
import IconButton from "@material-ui/core/IconButton";
import Description from "@material-ui/icons/Description";
import VideoMetadata from "./VideoMetadata.jsx";

const styles = theme => ({
  root: {
    width: "90%"
  },
  form: {
    width: "10%"
  },
  center: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },
  button: {
    marginTop: theme.spacing.unit,
    marginRight: theme.spacing.unit
  },
  actionsContainer: {
    marginBottom: theme.spacing.unit * 2
  },
  resetContainer: {
    padding: theme.spacing.unit * 3
  },
  videoSelector: {
    height: "10%",
    overflow: "auto"
  },
  userSelector: {
<<<<<<< HEAD
    overflow: 'auto'
=======
    // height: '50%',
    overflow: "auto"
  },
  conceptSelector: {
    height: "50%",
    overflow: "auto"
>>>>>>> origin/master
  }
});

class TrainModel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videos: [],
      videosSelected: [],
      users: [],
      usersSelected: [],
      models: [],
      modelSelected: "",
      activeStep: 0,
      openedVideo: null
    };
  }

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

  componentDidMount = () => {
    this.loadExistingModels();
    this.loadVideoList();
    this.loadUserList();
<<<<<<< HEAD
  }
=======
    this.loadConceptList();
  };
>>>>>>> origin/master

  loadExistingModels = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
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
        console.log("Error in get /api/models");
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  loadUserList = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.get(`/api/users`, config).then(res => {
      this.setState({
        users: res.data
      });
    })
  }

  loadVideoList = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios.get(`/api/videos`, config).then(res => {
      let [, unwatchedVideos, watchedVideos, inProgressVideos] = res.data;
      const videos = unwatchedVideos.rows.concat(
        watchedVideos.rows,
        inProgressVideos.rows
      );
      this.setState({
        videos: videos
      });
    });
  };

<<<<<<< HEAD
=======
  loadConceptList = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios.get(`/api/concepts`, config).then(res => {
      this.setState({
        concepts: res.data
      });
    });
  };

  loadUserList = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios.get(`/api/users`, config).then(res => {
      this.setState({
        users: res.data
      });
    });
  };

>>>>>>> origin/master
  handleSelect = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  selectModel = () => {
    return (
      <FormControl className={this.props.classes.form}>
        <InputLabel>Select Model</InputLabel>
        <Select
          name="modelSelected"
          value={this.state.modelSelected}
          onChange={this.handleSelect}
        >
          {this.state.models.map(model => (
            <MenuItem key={model.name} value={model.name}>
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

<<<<<<< HEAD
=======
  handleVideoSelect = filename => event => {
    let videosSelected = JSON.parse(JSON.stringify(this.state.videosSelected));
    if (event.target.checked) {
      videosSelected.push(filename);
    } else {
      videosSelected = videosSelected.filter(video => video !== filename);
    }
    this.setState({
      videosSelected: videosSelected
    });
  };

  selectVideo = () => {
    return (
      <FormControl
        component="fieldset"
        className={this.props.classes.videoSelector}
      >
        <FormLabel component="legend">Select Videos to Train With</FormLabel>
        <FormGroup>
          {this.state.videos.map(video => (
            <div key={video.filename}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={this.handleVideoSelect(video.filename)}
                    color="primary"
                  />
                }
                label={video.filename}
              />
              <IconButton style={{ float: "right" }}>
                <Description
                  onClick={event => this.openVideoMetadata(event, video)}
                />
              </IconButton>
            </div>
          ))}
        </FormGroup>
      </FormControl>
    );
  };

>>>>>>> origin/master
  handleUserSelect = id => event => {
    let usersSelected = JSON.parse(JSON.stringify(this.state.usersSelected));
    if (event.target.checked) {
      usersSelected.push(id);
    } else {
      usersSelected = usersSelected.filter(user => user !== id);
    }
    this.setState({
      usersSelected: usersSelected
    });
  };

  selectUser = () => {
    return (
      <FormControl
        component="fieldset"
        className={this.props.classes.userSelector}
      >
        <FormLabel component="legend">
          Select Users Whose Annotations to Use
        </FormLabel>
        <FormGroup>
          {this.state.users.map(user => (
            <div key={user.id}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={this.handleUserSelect(user.id)}
                    color="primary"
                  />
                }
                label={user.username}
              />
            </div>
          ))}
        </FormGroup>
      </FormControl>
    );
  };

<<<<<<< HEAD
  handleVideoSelect = videoid => event => {
    let videosSelected = JSON.parse(JSON.stringify(this.state.videosSelected));
    if (event.target.checked) {
      videosSelected.push(videoid)
=======
  handleConceptSelect = id => event => {
    let conceptsSelected = JSON.parse(
      JSON.stringify(this.state.conceptsSelected)
    );
    if (event.target.checked) {
      conceptsSelected.push(id);
>>>>>>> origin/master
    } else {
      videosSelected = videosSelected.filter(id => id !== videoid);
    }
    this.setState({
<<<<<<< HEAD
      videosSelected: videosSelected
    })
  }
=======
      conceptsSelected: conceptsSelected
    });
  };
>>>>>>> origin/master

  selectVideo = () => {
    return (
      <FormControl
        component="fieldset"
        className={this.props.classes.videoSelector}
      >
        <FormLabel component="legend">Select Videos to Train With</FormLabel>
        <FormGroup>
          {this.state.videos.map(video => (
            <div key={video.filename}>
              <FormControlLabel
                control={
                  <Checkbox
<<<<<<< HEAD
                    onChange={this.handleVideoSelect(video.id)}
                    color='primary'
                  />
                }
                label={video.filename}
              >
              </FormControlLabel>
              <IconButton style={{ float: 'right' }}>
                <Description
                  onClick={
                    (event) =>
                      this.openVideoMetadata(
                        event,
                        video,
                      )
                  }
                />
              </IconButton>
=======
                    onChange={this.handleConceptSelect(concept.id)}
                    color="primary"
                  />
                }
                label={concept.name}
              />
>>>>>>> origin/master
            </div>
          ))}
        </FormGroup>
      </FormControl>
    );
  };

  getSteps = () => {
<<<<<<< HEAD
    return ['Select model', 'Select users', 'Select videos'];
  }
=======
    return ["Select model", "Select users", "Select concepts", "Select videos"];
  };
>>>>>>> origin/master

  getStepContent = step => {
    switch (step) {
      case 0:
        return this.selectModel();
      case 1:
        return this.selectUser();
      case 2:
        return this.selectVideo();
      default:
        return "Unknown step";
    }
  };

  handleNext = () => {
    this.setState(state => ({
      activeStep: state.activeStep + 1
    }));
  };

  handleBack = () => {
    this.setState(state => ({
      activeStep: state.activeStep - 1
    }));
  };

  handleStop = () => {
    this.setState({
      activeStep: 0
    });
  };

  render() {
    const { classes } = this.props;
    const steps = this.getSteps();
    const {
      videos,
      videosSelected,
      usersSelected,
      modelSelected,
      activeStep,
      openedVideo
    } = this.state;
    if (!videos) {
      return <div>Loading...</div>;
    }
    return (
      <div className={classes.root}>
        <div className={classes.center}>
<<<<<<< HEAD
          <h1 style={{ color: 'red' }}>This page is still in progress</h1>
          <Typography variant="display1">Train a model on video(s)</Typography><br />
          <ErrorModal
            errorMsg={errorMsg}
            open={errorMsg}
            handleClose={this.closeErrorModal}
          />
=======
          <h1 style={{ color: "red" }}>This page is still in progress</h1>
          <Typography variant="display1">Train a model on video(s)</Typography>
          <br />
>>>>>>> origin/master
        </div>
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
                        (activeStep === 0 && modelSelected === "") ||
                        (activeStep === 1 && usersSelected.length < 1) ||
                        (activeStep === 2 && videosSelected.length < 1)
                      }
                    >
                      {activeStep === steps.length - 1 ? "Train Model" : "Next"}
                    </Button>
                  </div>
                </div>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === steps.length && (
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography>Model is training...</Typography>
            <CircularProgress />
            <Button onClick={this.handleStop} className={classes.button}>
              Stop
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

TrainModel.propTypes = {
  classes: PropTypes.object
};

export default withStyles(styles)(TrainModel);

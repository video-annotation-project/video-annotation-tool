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

//Select hyperparameters
import TextField from '@material-ui/core/TextField';

//Websockets
import io from "socket.io-client"

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
    maxHeight: "150px",
    overflow: "auto"
  },
  userSelector: {
    overflow: 'auto'
  },
  hyperparametersForm: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  textField: {
    marginLeft: theme.spacing,
    marginRight: theme.spacing,
    width: 200,
  }
});

class TrainModel extends Component {
  constructor(props) {
    super(props);
    // here we do a manual conditional proxy because React won't do it for us
    let socket;
    if (window.location.origin === "http://localhost:3000") {
      console.log("manually proxying socket");
      socket = io("http://localhost:3001");
    } else {
      socket = io();
    }
    socket.on("connect", () => {
      console.log("socket connected!");
    });
    socket.on("reconnect_attempt", attemptNumber => {
      console.log("reconnect attempt", attemptNumber);
    });
    socket.on("disconnect", reason => {
      console.log(reason);
    });
    socket.on("refresh trainmodel", this.loadOptionInfo);

    this.state = {
      videos: [],
      videosSelected: [],
      users: [],
      usersSelected: [],
      models: [],
      modelSelected: "",
      minImages: 5000,
      epochs: 0,
      activeStep: 0,
      openedVideo: null,
      socket: socket
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
    this.loadOptionInfo();
    this.loadExistingModels();
    this.loadUserList();
  }

  loadOptionInfo = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    let option = "trainmodel";
    axios
      .get(`/api/modelTab/${option}`, config)
      .then(res => {
        const info = res.data[0].info;
        this.setState({
          activeStep: info.activeStep,
          usersSelected: info.usersSelected,
          videosSelected: info.videosSelected,
          modelSelected: info.modelSelected,
          minImages: info.minImages,
          epochs: info.epochs
        });
        if (info.usersSelected) {
          this.loadVideoList();
        }
      })
      .catch(error => {
        console.log("Error in get /api/modelTab");
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
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

  loadVideoList = async () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios.get(
      `/api/videos/usersViewed/` + this.state.usersSelected,
      config
    ).then(res => {
      this.setState({
        videos: res.data
      });
    });
  };

  handleChange = event => {
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
          onChange={this.handleChange}
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
                    checked={this.state.usersSelected.includes(user.id)}
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

  handleVideoSelect = videoid => event => {
    let videosSelected = JSON.parse(JSON.stringify(this.state.videosSelected));
    if (event.target.checked) {
      videosSelected.push(videoid)
    } else {
      videosSelected = videosSelected.filter(id => id !== videoid);
    }
    this.setState({
      videosSelected: videosSelected
    })
  }

  selectVideo = () => {
    if (!this.state.videosSelected) {
      return (
        <div>Loading...</div>
      )
    }
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
                    onChange={this.handleVideoSelect(video.id)}
                    color='primary'
                    checked={
                      this.state.videosSelected.includes(video.id)
                    }
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
            </div>
          ))}
        </FormGroup>
      </FormControl>
    );
  };

  selectHyperparameters = () => {
    const classes = this.props.classes;
    return (
      <form className={classes.hyperparametersForm}>
        <TextField
          margin='normal'
          name='epochs'
          label='Number of epochs (0=Until Increased Loss)'
          value={this.state.epochs}
          onChange={this.handleChange}
        />
        <TextField
          margin="normal"
          name='minImages'
          label='Number Training Images'
          value={this.state.minImages}
          onChange={this.handleChange}
        />
      </form>
    )
  }

  getSteps = () => {
    return [
      'Select model',
      'Select users',
      'Select videos',
      'Select hyperparameters'
    ];
  }

  getStepContent = step => {
    switch (step) {
      case 0:
        return this.selectModel();
      case 1:
        return this.selectUser();
      case 2:
        return this.selectVideo();
      case 3:
        return this.selectHyperparameters();
      default:
        return "Unknown step";
    }
  };

  updateBackendInfo = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    let info = {
      activeStep: this.state.activeStep,
      modelSelected: this.state.modelSelected,
      usersSelected: this.state.usersSelected,
      videosSelected: this.state.videosSelected,
      epochs: this.state.epochs,
      minImages: this.state.minImages
    };
    const body = {
      info: JSON.stringify(info)
    };
    // update SQL database
    axios
      .put("/api/modelTab/trainmodel", body, config)
      .then(res => {
        console.log(this.state.socket);
        this.state.socket.emit("refresh trainmodel");
      })
      .catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
      });
  };

  handleNext = () => {
    // After users have been selected load user videos
    if (this.state.activeStep === 1) {
      this.loadVideoList();
    }
    this.setState(state => ({
      activeStep: state.activeStep + 1
    }), () => {
      if (this.state.activeStep === 4) {
        //Start Model EC2
        this.startEC2();
      }
      this.updateBackendInfo();
    });
  };

  handleBack = () => {
    this.setState(state => ({
      activeStep: state.activeStep - 1
    }), () => {
      this.updateBackendInfo();
    });
  };

  handleStop = () => {
    this.setState({
      activeStep: 0
    }, () => {
      this.updateBackendInfo();
      //Stop Model EC2
      this.stopEC2();
    });
  };


  startEC2 = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      modelSelected: this.state.modelSelected
    };
    axios.put(`/api/trainModel`, body, config).then(res => {
      console.log(res);
    });
  };

  stopEC2 = () => {
    const config = {
      url: "/api/trainModel",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      data: {
        modelSelected: this.state.modelSelected
      },
      method: "delete"
    };
    axios.request(config).then(res => {
      console.log(res);
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
          <h1 style={{ color: "red" }}>This page is still in progress</h1>
          <Typography variant="display1">Train a model on video(s)</Typography>
          <br />
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

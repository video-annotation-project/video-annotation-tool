import React, { Component } from 'react';
import axios from 'axios';

import ErrorModal from './ErrorModal.jsx';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

//Steppers for choosing model and videos
import PropTypes from 'prop-types';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';

//Display progress circle
import CircularProgress from '@material-ui/core/CircularProgress';

//Select Model
import { FormControl } from '@material-ui/core';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

//Select Video
import Radio from "@material-ui/core/Radio";
//Video description
import IconButton from '@material-ui/core/IconButton';
import Description from '@material-ui/icons/Description';
import VideoMetadata from './VideoMetadata.jsx';

//Websockets
import io from 'socket.io-client';

const styles = theme => ({
  root: {
    width: '90%'
  },
  form: {
    width: '10%'
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  button: {
    marginTop: theme.spacing.unit,
    marginRight: theme.spacing.unit,
  },
  actionsContainer: {
    marginBottom: theme.spacing.unit * 2,
  },
  resetContainer: {
    padding: theme.spacing.unit * 3,
  },
  videoSelector: {
    width: '50%',
    height: '500px',
    overflow: 'auto',
  }
});


class RunModel extends Component {
  constructor(props) {
    super(props);
    // here we do a manual conditional proxy because React won't do it for us
    let socket;
    if (window.location.origin === 'http://localhost:3000') {
      console.log('manually proxying socket')
      socket = io('http://localhost:3001');
    } else {
      socket = io();
    }
    socket.on('connect', () => {
      console.log('socket connected!');
    });
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('reconnect attempt', attemptNumber);
    });
    socket.on('disconnect', reason => {
      console.log(reason);
    });
    socket.on('reload run model', this.loadOptionInfo);

    this.state = {
      models: [],
      modelSelected: '',
      videos: [],
      videoSelected: '',
      users: [],
      userSelected: '',
      activeStep: 0,
      errorMsg: null,
      openedVideo: null,
      socket: socket
    };
  }

  //Methods for video meta data
  openVideoMetadata = (event, video) => {
    event.stopPropagation()
    this.setState({
      openedVideo: video
    })
  }

  closeVideoMetadata = () => {
    this.setState({
      openedVideo: null
    });
  }


  componentDidMount = () => {
    this.loadOptionInfo();
    this.loadExistingModels();
    this.loadVideoList();
    this.loadUserList();
  }

  componentWillUnmount = () => {
    this.state.socket.disconnect();
  }

  loadOptionInfo = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    let option = 'runmodel';
    axios.get(`/api/modelTab/${option}`, config).then(res => {
      const info = res.data[0].info;
      this.setState({
        activeStep: info.activeStep,
        userSelected: info.userSelected,
        videoSelected: info.videoSelected,
        modelSelected: info.modelSelected
      });
    }).catch(error => {
      console.log('Error in get /api/modelTab');
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    })
  }

  loadExistingModels = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.get(`/api/models`, config).then(res => {
      this.setState({
        models: res.data
      })
    }).catch(error => {
      console.log('Error in get /api/models');
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    })
  }

  loadVideoList = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.get(`/api/videos`, config).then(res => {
      let [
        ,
        unwatchedVideos,
        watchedVideos,
        inProgressVideos] = res.data;
      const videos = unwatchedVideos.rows.concat(
        watchedVideos.rows,
        inProgressVideos.rows);
      this.setState({
        videos: videos
      });
    })
  }

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

  handleSelect = event => {
    this.setState({
      [event.target.name]: event.target.value
    })
  }

  selectModel = () => {
    return (
      <FormControl className={this.props.classes.form}>
        <InputLabel>Select Model</InputLabel>
        <Select
          name='modelSelected'
          value={this.state.modelSelected}
          onChange={this.handleSelect}
        >
          {this.state.models.map(model => (
            <MenuItem
              key={model.name}
              value={model.name}
            >
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  selectVideo = () => {
    return (
      <FormControl
        component="fieldset"
        className={this.props.classes.videoSelector}
      >
        {this.state.videos.map(video => (
          <div
            key={video.filename}
          >
            <Radio
              name='videoSelected'
              color='default'
              checked={this.state.videoSelected === video.filename}
              value={video.filename}
              onChange={this.handleSelect}
            />
            {video.filename}
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
      </FormControl>
    );
  }

  selectUser = () => {
    return (
      <FormControl className={this.props.classes.form}>
        <InputLabel>Select User</InputLabel>
        <Select
          name='userSelected'
          value={this.state.userSelected}
          onChange={this.handleSelect}
        >
          {this.state.users.map(user => (
            <MenuItem
              key={user.id}
              value={user.username}
            >
              {user.username}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  getSteps = () => {
    return ['Select model', 'Select videos', 'Select user'];
  }

  getStepContent = (step) => {
    switch (step) {
      case 0:
        return this.selectModel();
      case 1:
        return this.selectVideo();
      case 2:
        return this.selectUser();
      default:
        return 'Unknown step';
    }
  }

  updateBackendInfo = (step) => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    let info = {
      activeStep: this.state.activeStep,
      modelSelected: this.state.modelSelected,
      userSelected: this.state.userSelected,
      videoSelected: this.state.videoSelected
    };
    const body = {
      'info': JSON.stringify(info)
    };
    // update SQL database
    axios.put(
      '/api/modelTab/runmodel',
      body,
      config).then(res => {
        console.log(this.state.socket);
        
        this.state.socket.emit('reload run model');
      }).catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
      });
  }

  handleNext = () => {
    this.setState(state => ({
      activeStep: state.activeStep + 1,
    }), () => {
      if (this.state.activeStep === 3) {
        console.log('Last Step Starting Model...');
        this.startEC2();
      }
      this.updateBackendInfo();
    });
  };

  handleBack = () => {
    this.setState(state => ({
      activeStep: state.activeStep - 1,
    }), () => {
      this.updateBackendInfo();
    });
  };

  handleStop = () => {
    this.setState({
      activeStep: 0,
    });
    this.stopEC2();
  };

  //Code for closing modal
  closeErrorModal = () => {
    this.setState({ errorMsg: false });
  };

  startEC2 = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    const body = {
      'modelSelected': this.state.modelSelected,
      'userSelected': this.state.userSelected,
      'videoSelected': this.state.videoSelected
    };
    axios.put(
      `/api/runModel`,
      body,
      config,
    ).then(res => {
      console.log(res);
    })
  }

  stopEC2 = () => {
    const config = {
      url: '/api/runModel',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      data: {
        'modelSelected': this.state.modelSelected,
      },
      method: 'delete'
    };
    axios.request(config).then(res => {
      console.log(res);
    })
  }

  render() {
    const { classes } = this.props;
    const steps = this.getSteps();
    const {
      modelSelected,
      videos,
      videoSelected,
      userSelected,
      activeStep,
      errorMsg,
      openedVideo
    } = this.state;
    if (!videos) {
      return (
        <div>Loading...</div>
      )
    }
    return (
      <div className={classes.root}>
        <div className={classes.center}>
          <h1 style={{ color: 'red' }}>This page is still in progress</h1>
          <Typography variant="display1">Run a trained model on video(s)</Typography><br />
          <ErrorModal
            errorMsg={errorMsg}
            open={!!errorMsg}
            handleClose={this.closeErrorModal}
          />
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
                        (activeStep === 0 && modelSelected === '') ||
                        (activeStep === 1 && videoSelected.length < 1) ||
                        (activeStep === 2 && userSelected === '')
                      }
                    >
                      {activeStep === steps.length - 1 ? 'Run Model' : 'Next'}
                    </Button>
                  </div>
                </div>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === steps.length && (
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography>Model is running/generating images...</Typography>
            <CircularProgress />
            <Button onClick={this.handleStop} className={classes.button}>
              Stop
            </Button>
          </Paper>
        )}
        {this.state.openedVideo &&
          <VideoMetadata
            open={true /* The VideoMetadata 'openness' is controlled through
              boolean logic rather than by passing in a variable as an
              attribute. This is to force VideoMetadata to unmount when it 
              closes so that its state is reset. This also prevents the 
              accidental double submission bug, by implicitly reducing 
              the transition time of VideoMetadata to zero. */}
            handleClose={this.closeVideoMetadata}
            openedVideo={openedVideo}
            loadVideos={this.props.loadVideos}
            modelTab={true}
          />
        }
      </div>
    );
  }
}

RunModel.propTypes = {
  classes: PropTypes.object,
};

export default withStyles(styles)(RunModel);

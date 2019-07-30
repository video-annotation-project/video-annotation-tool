import React, { Component } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';
import { FormControl } from '@material-ui/core';
import FormGroup from '@material-ui/core/FormGroup';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Radio from '@material-ui/core/Radio';
import IconButton from '@material-ui/core/IconButton';
import Description from '@material-ui/icons/Description';

import VideoMetadata from '../Utilities/VideoMetadata';

const styles = theme => ({
  root: {
    marginTop: 10,
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
    marginTop: theme.spacing(),
    marginRight: theme.spacing()
  },
  actionsContainer: {
    marginBottom: theme.spacing(2)
  },
  resetContainer: {
    padding: theme.spacing(3)
  },
  videoForm: {
    maxHeight: '400px',
    overflow: 'auto',
    width: '630px'
  }
});

class PredictModel extends Component {
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
    socket.on('refresh predictmodel', this.loadOptionInfo);

    this.state = {
      models: [],
      modelSelected: '',
      videos: [],
      videoSelected: '',
      users: [],
      userSelected: '',
      activeStep: 0,
      openedVideo: null,
      socket
    };
  }

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

  componentDidMount = () => {
    this.loadOptionInfo();
    this.loadExistingModels();
    this.loadVideoList();
    this.loadUserList();
  };

  componentWillUnmount = () => {
    const { socket } = this.state;
    socket.disconnect();
  };

  loadOptionInfo = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const option = 'predictmodel';
    axios
      .get(`/api/models/train/${option}`, config)
      .then(res => {
        const { info } = res.data[0];
        this.setState({
          activeStep: info.activeStep,
          userSelected: info.userSelected,
          videoSelected: info.videoSelected,
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

  loadVideoList = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios.get(`/api/videos`, config).then(res => {
      const { unwatchedVideos, watchedVideos, inProgressVideos } = res.data;
      const videos = unwatchedVideos.concat(watchedVideos, inProgressVideos);
      this.setState({
        videos
      });
    });
  };

  loadUserList = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios.get(`/api/users`, config).then(res => {
      this.setState({
        users: res.data
      });
    });
  };

  handleSelect = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  selectModel = () => {
    const { classes } = this.props;
    const { modelSelected, models } = this.state;

    return (
      <FormControl className={classes.form}>
        <InputLabel>Select Model</InputLabel>
        <Select
          name="modelSelected"
          value={modelSelected}
          onChange={this.handleSelect}
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

  selectVideo = () => {
    const { classes } = this.props;
    const { videos, videoSelected } = this.state;

    return (
      <FormControl component="fieldset" className={classes.videoForm}>
        <FormGroup>
          {videos.map(video => (
            <div key={video.filename}>
              <Radio
                name="videoSelected"
                color="primary"
                checked={videoSelected === video.id.toString()}
                value={video.id.toString()}
                onChange={this.handleSelect}
              />
              {video.filename}
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
    );
  };

  selectUser = () => {
    const { classes } = this.props;
    const { userSelected, users } = this.state;
    return (
      <FormControl className={classes.form}>
        <InputLabel>Select User</InputLabel>
        <Select
          name="userSelected"
          value={userSelected}
          onChange={this.handleSelect}
        >
          {users.map(user => (
            <MenuItem key={user.id} value={user.id}>
              {user.username}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  getSteps = () => {
    return ['Select model', 'Select videos', 'Select user'];
  };

  getStepContent = step => {
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
  };

  updateBackendInfo = () => {
    const {
      activeStep,
      modelSelected,
      userSelected,
      videoSelected,
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
      userSelected,
      videoSelected
    };
    const body = {
      info: JSON.stringify(info)
    };
    // update SQL database
    axios
      .put('/api/models/train/predictmodel', body, config)
      .then(() => {
        socket.emit('refresh predictmodel');
      })
      .catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
      });
  };

  handleNext = () => {
    const { activeStep } = this.state;

    this.setState(
      state => ({
        activeStep: state.activeStep + 1
      }),
      () => {
        if (activeStep === 3) {
          console.log('Last Step Starting Model...');
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

  postModelInstance = command => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      command,
      modelInstanceId: 'i-0f2287cb0fc621b6d'
    };
    axios.post(`/api/models`, body, config).then(res => {
      console.log(res);
    });
  };

  render() {
    const { classes, loadVideos } = this.props;
    const steps = this.getSteps();
    const {
      modelSelected,
      videos,
      videoSelected,
      userSelected,
      activeStep,
      openedVideo
    } = this.state;
    if (!videos) {
      return <div>Loading...</div>;
    }
    return (
      <div className={classes.root}>
        <div className={classes.center}>
          <Typography variant="h6">Run a trained model on video(s)</Typography>
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
                        (activeStep === 0 && modelSelected === '') ||
                        (activeStep === 1 && videoSelected.length < 1) ||
                        (activeStep === 2 && userSelected === '')
                      }
                    >
                      {activeStep === steps.length - 1 ? 'Predict' : 'Next'}
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
        {openedVideo && (
          <VideoMetadata
            open
            handleClose={this.closeVideoMetadata}
            openedVideo={openedVideo}
            loadVideos={loadVideos}
            modelTab
          />
        )}
      </div>
    );
  }
}

export default withStyles(styles)(PredictModel);

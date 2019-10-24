import React, { Component } from 'react';
import io from 'socket.io-client';
import Slider from '@material-ui/core/Slider';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Hotkeys from 'react-hot-keys';
import Grid from '@material-ui/core/Grid';
import axios from 'axios';
import IconButton from '@material-ui/core/IconButton';
import Description from '@material-ui/icons/Description';
import DeleteIcon from '@material-ui/icons/Delete';

import Modal from '@material-ui/core/Modal';
import Summary from '../Utilities/Summary';

const styles = theme => ({
  videoContainer: {
    top: '60px',
    width: '1600px',
    height: '900px'
  },
  button: {
    marginTop: '10px',
    marginLeft: '20px',
    marginBottom: '10px'
  },
  videoName: {
    marginTop: theme.spacing(1.5)
  },
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none'
  },
  modaldiv: {
    backgroundColor: theme.palette.background.paper
  }
});

class Annotate extends Component {
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
    // const socket = io({transports: ['polling, websocket']});

    socket.on('connect', () => {
      console.log('socket connected!');
    });
    socket.on('reconnect_attempt', attemptNumber => {
      console.log('reconnect attempt', attemptNumber);
    });
    socket.on('disconnect', reason => {
      console.log(reason);
    });
    socket.on('refresh videos', this.loadVideos);

    this.state = {
      aiVideos: [],
      currentVideo: null,
      isLoaded: false,
      videoPlaybackRate: 1.0,
      error: null,
      socket,
      descriptionOpen: false,
      summary: null,
      metrics: null
    };
  }

  componentDidMount = async () => {
    // add event listener for closing or reloading window
    window.addEventListener('beforeunload', this.handleUnload);
  };

  openVideoSummary = async (event, video) => {
    event.stopPropagation();

    this.setState({
      descriptionOpen: true,
      summary: await this.getSummary(video),
      metrics: await this.getMetrics(video)
    });
  };

  getSummary = async video => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    let ret;
    try {
      const summary = await axios.get(
        `/api/videos/aivideos/summary/${video}`,
        config
      );

      if (summary) {
        ret = summary;
      }
    } catch (error) {
      console.log('Error in summary.jsx get /api/videos/aivideos/summary');
      console.log(error.response.data);
      ret = error.response;
    }
    return ret;
  };

  deleteAiVideo = async video => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: {
        video: video
      }
    };
    try {
      let res = await axios.delete('/api/videos/aivideos', config);
      console.log(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  getMetrics = async video => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    let ret;
    try {
      const metrics = await axios.get(
        `/api/videos/aivideos/metrics?filename=${video}`,
        config
      );
      if (metrics) {
        ret = metrics.data;
      }
    } catch (error) {
      console.error('Error in summary.jsx get /api/videos/aivideos/metrics');
      console.error(error.response.data);
      ret = error.response;
    }
    return ret;
  };

  closeVideoSummary = () => {
    this.setState({
      descriptionOpen: false,
      summary: null,
      metrics: null
    });
  };

  handleUnload = ev => {
    const event = ev;
    const videoElement = document.getElementById('video');
    if (!videoElement.paused) {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to close?';
    }
  };

  handleKeyDown = (keyName, e) => {
    e.preventDefault();
    switch (keyName) {
      case 'space':
        this.playPause();
        break;
      case 'right':
        this.skipVideoTime(1);
        break;
      case 'left':
        this.skipVideoTime(-1);
        break;
      default:
    }
  };

  skipVideoTime = time => {
    const videoElement = document.getElementById('video');
    const cTime = videoElement.currentTime;
    videoElement.currentTime = cTime + time;
  };

  playPause = () => {
    const videoElement = document.getElementById('video');
    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  };

  toggleVideoControls = () => {
    const videoElement = document.getElementById('video');
    videoElement.controls = !videoElement.controls;
  };

  handleChangeSpeed = (event, value) => {
    const { videoPlaybackRate } = this.state;
    this.setState(
      {
        videoPlaybackRate: Math.round(value * 10) / 10
      },
      () => {
        const videoElement = document.getElementById('video');
        videoElement.playbackRate = videoPlaybackRate;
      }
    );
  };

  render() {
    const { classes, videoModalOpen, toggleStateVariable, video } = this.props;
    const {
      error,
      videoPlaybackRate,
      summary,
      descriptionOpen,
      metrics
    } = this.state;

    if (error) {
      return (
        <Modal
          className={classes.modal}
          open={videoModalOpen}
          onClose={() => toggleStateVariable(false, 'videoModalOpen')}
        >
          <Typography style={{ margin: '20px' }}>Error: {error}</Typography>
        </Modal>
      );
    }
    return (
      <Modal
        className={classes.modal}
        open={videoModalOpen}
        onClose={() => toggleStateVariable(false, 'videoModalOpen')}
      >
        <div className={classes.modaldiv}>
          <Hotkeys
            keyName="space, right, left"
            onKeyDown={this.handleKeyDown}
          />
          <Grid container className={classes.root} spacing={2}>
            <Grid item xs></Grid>
            <Grid item xs>
              <Typography
                variant="h5"
                align="center"
                className={classes.videoName}
              >
                {`${video}`}
              </Typography>
            </Grid>
            <Grid item xs />
          </Grid>
          <Grid container className={classes.root} spacing={2}>
            <Grid item xs />
            <Grid item xs>
              <div>
                <div className={classes.videoContainer}>
                  <video
                    className={classes.videoContainer}
                    id="video"
                    width="1600"
                    height="900"
                    src={`https://cdn.deepseaannotations.com/ai_videos/${video}`}
                    type="video/mp4"
                    crossOrigin="use-credentials"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div
                  style={{
                    float: 'left'
                  }}
                >
                  <Slider
                    style={{
                      width: 200,
                      marginTop: 0
                    }}
                    value={videoPlaybackRate}
                    min={0}
                    max={4}
                    step={0.1}
                    onChange={this.handleChangeSpeed}
                  />
                  <Typography>Play Rate: {videoPlaybackRate}</Typography>
                </div>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  onClick={() => this.skipVideoTime(-5)}
                >
                  -5 sec
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  onClick={this.playPause}
                >
                  Play/Pause
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  onClick={() => this.skipVideoTime(5)}
                >
                  +5 sec
                </Button>
                <IconButton
                  onClick={event => this.openVideoSummary(event, video)}
                >
                  <Description />
                </IconButton>
                <IconButton
                  aria-label="Delete"
                  onClick={() => this.deleteAiVideo(video)}
                >
                  <DeleteIcon />
                </IconButton>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  onClick={() => toggleStateVariable(false, 'videoModalOpen')}
                  style={{ float: 'right' }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  onClick={() => this.toggleVideoControls()}
                  style={{ float: 'right' }}
                >
                  Toggle Controls
                </Button>
              </div>
            </Grid>
            <Grid item xs />
          </Grid>
          {descriptionOpen && (
            <Summary
              open
              handleClose={this.closeVideoSummary}
              summary={summary}
              aiSummary
              metrics={metrics}
            />
          )}
        </div>
      </Modal>
    );
  }
}

export default withStyles(styles)(Annotate);

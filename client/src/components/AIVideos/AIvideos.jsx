import React, { Component } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Slider from '@material-ui/core/Slider';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Hotkeys from 'react-hot-keys';
import Grid from '@material-ui/core/Grid';

import DragBoxContainer from '../Utilities/DragBoxContainer';
import AIvideoList from './AIvideoList';

const styles = () => ({
  videoContainer: {
    top: '60px',
    width: '1600px',
    height: '900px'
  },
  button: {
    marginTop: '10px',
    marginLeft: '20px',
    marginBottom: '10px'
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
      socket
    };
  }

  componentDidMount = async () => {
    // add event listener for closing or reloading window
    window.addEventListener('beforeunload', this.handleUnload);

    try {
      this.loadVideos(this.getCurrentVideo);
    } catch (error) {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      const errMsg =
        error.response.data.detail || error.response.data.message || 'Error';
      console.log(errMsg);
      this.setState({
        isLoaded: true,
        error: errMsg
      });
    }
  };

  componentWillUnmount = () => {
    const { socket } = this.state;
    // this.updateCheckpoint(false, false);
    socket.disconnect();
    window.removeEventListener('beforeunload', this.handleUnload);
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

  loadVideos = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios.get('/api/videos/aivideos', config).then(res => {
      this.setState({
        aiVideos: res.data.rows
      });
      this.getCurrentVideo();
    });
  };

  getCurrentVideo = () => {
    const { aiVideos } = this.state;
    // if user does not have a video to be played, return default video 1
    const firstVideo = {
      id: aiVideos[0].id,
      filename: aiVideos[0].name,
      timeinvideo: 0
    };
    this.setState(
      {
        currentVideo: firstVideo,
        isLoaded: true
      },
      () => {
        const { currentVideo } = this.state;
        const videoElement = document.getElementById('video');
        videoElement.currentTime = currentVideo.timeinvideo;
      }
    );
  };

  handleVideoClick = async clickedVideo => {
    const currentVideo = {
      id: clickedVideo.id,
      filename: clickedVideo.name,
      timeinvideo: 0
    };
    this.setState({
      currentVideo
    });
  };

  render() {
    const { classes } = this.props;
    const {
      currentVideo,
      aiVideos,
      isLoaded,
      error,
      socket,
      videoPlaybackRate
    } = this.state;
    if (!isLoaded) {
      return <div>Loading...</div>;
    }
    if (error) {
      return <div>Error: {error}</div>;
    }
    return (
      <React.Fragment>
        <Hotkeys keyName="space, right, left" onKeyDown={this.handleKeyDown} />
        <Grid container className={classes.root} spacing={2}>
          <Grid item xs>
            <AIvideoList
              handleVideoClick={this.handleVideoClick}
              aiVideos={aiVideos}
              socket={socket}
              loadVideos={this.loadVideos}
            />
          </Grid>
          <Grid item xs>
            <Typography variant="h5">
              {`${currentVideo.id} ${currentVideo.filename}`}
            </Typography>
          </Grid>
          <Grid item xs />
        </Grid>
        <Grid container className={classes.root} spacing={2}>
          <Grid item xs />
          <Grid item xs>
            <div>
              <DragBoxContainer className={classes.videoContainer}>
                <video
                  className={classes.videoContainer}
                  //   onPause={() => this.updateCheckpoint(false, true)}
                  id="video"
                  width="1600"
                  height="900"
                  src={`https://cdn.deepseaannotations.com/ai_videos/${currentVideo.filename}`}
                  type="video/mp4"
                  crossOrigin="use-credentials"
                >
                  Your browser does not support the video tag.
                </video>
              </DragBoxContainer>
              <div
                style={{
                  // marginTop: '10px',
                  // marginLeft: '20px',
                  // marginBottom: '10px',
                  float: 'left'
                }}
              >
                <Slider
                  style={{
                    width: 200,
                    marginTop: 10
                  }}
                  value={videoPlaybackRate}
                  min={0}
                  max={4}
                  step={0.1}
                  onChange={this.handleChangeSpeed}
                />
                <Typography
                  color="textSecondary"
                  style={{
                    marginTop: 0
                  }}
                >
                  Play Rate: {videoPlaybackRate}
                </Typography>
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
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(Annotate);

import React, { Component } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Slider from '@material-ui/core/Slider';
import Swal from 'sweetalert2/src/sweetalert2';

import Hotkeys from 'react-hot-keys';
import Grid from '@material-ui/core/Grid';
import ConceptsSelected from './Utilities/ConceptsSelected';
import DialogModal from './Utilities/DialogModal';
import VideoList from './Utilities/VideoList';
import DragBoxContainer from './Utilities/DragBoxContainer';

const styles = theme => ({
  videoContainer: {
    top: '50px',
    width: '1600px',
    height: '900px'
  },
  dragBox: {
    margin: '0px',
    backgroundColor: 'transparent',
    border: '2px coral solid',
    borderStyle: 'ridge'
  },
  button: {
    marginTop: '10px',
    marginLeft: '20px',
    marginBottom: '10px'
  },
  text: {
    margin: theme.spacing(2)
  },
  videoName: {
    marginTop: theme.spacing(1.5)
  }
});

class Annotate extends Component {
  static handleUnload = ev => {
    const videoElement = document.getElementById('video');
    if (!videoElement.paused) {
      ev.preventDefault();
      ev.returnValue = 'Are you sure you want to close?';
    }
  };

  static skipVideoTime = time => {
    const videoElement = document.getElementById('video');
    const cTime = videoElement.currentTime;
    videoElement.currentTime = cTime + time;
  };

  static playPause = () => {
    const videoElement = document.getElementById('video');
    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  };

  static toggleVideoControls = () => {
    const videoElement = document.getElementById('video');
    videoElement.controls = !videoElement.controls;
  };

  toastPopup = Swal.mixin({
    toast: true,
    position: 'top-start',
    showConfirmButton: false,
    timer: 3000
  });

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
      currentVideo: null,
      dialogMsg: null,
      dialogOpen: false,
      clickedConcept: null,
      isLoaded: false,
      startedVideos: [],
      unwatchedVideos: [],
      watchedVideos: [],
      inProgressVideos: [],
      videoPlaybackRate: 1.0,
      error: null,
      socket,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    };
  }

  componentDidMount = async () => {
    // add event listener for closing or reloading window
    window.addEventListener('beforeunload', Annotate.handleUnload);

    // // add event listener for different key presses
    // document.addEventListener("keydown", this.handleKeyDown);

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
    this.updateCheckpoint(false, false);
    socket.disconnect();
    window.removeEventListener('beforeunload', Annotate.handleUnload);
  };

  handleKeyDown = (keyName, e) => {
    e.preventDefault();
    switch (keyName) {
      case 'space':
        Annotate.playPause();
        break;
      case 'right':
        Annotate.skipVideoTime(1);
        break;
      case 'left':
        Annotate.skipVideoTime(-1);
        break;
      default:
    }
  };

  handleChangeSpeed = (event, value) => {
    this.setState(
      {
        videoPlaybackRate: Math.round(value * 10) / 10
      },
      () => {
        const { videoPlaybackRate } = this.state;
        const videoElement = document.getElementById('video');
        videoElement.playbackRate = videoPlaybackRate;
      }
    );
  };

  loadVideos = callback => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios.get('/api/videos', config).then(res => {
      this.setState(
        {
          startedVideos: res.data.startedVideos,
          unwatchedVideos: res.data.unwatchedVideos,
          watchedVideos: res.data.watchedVideos,
          inProgressVideos: res.data.inProgressVideos
        },
        callback
      );
    });
  };

  getCurrentVideo = () => {
    const { startedVideos, unwatchedVideos } = this.state;
    // if user does not have a video to be played, return default video 1
    let currentVideo = {
      id: 1,
      filename: 'DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4',
      timeinvideo: 0,
      finished: true
    };
    if (startedVideos.length > 0) {
      // currentVideo is the first item in startedVideos
      [currentVideo] = startedVideos;
    } else if (unwatchedVideos.length > 0) {
      // currentVideo is the first item in unwatchedVideos
      [currentVideo] = unwatchedVideos;
    }
    this.setState(
      {
        currentVideo,
        isLoaded: true
      },
      () => {
        ({ currentVideo } = this.state);
        const videoElement = document.getElementById('video');
        videoElement.currentTime = currentVideo.timeinvideo;
        this.updateCheckpoint(false, true);
      }
    );
  };

  updateCheckpoint = (doneClicked, reloadVideos) => {
    const { currentVideo } = this.state;
    /*
      when the checkpoint for a video is updated, there are three places that
      need to reflect this: this.state.currentVideo, the videos list, and the 
      checkpoints table in the SQL database. Upon successful resolution of the 
      SQL database update, we reload the videos list by calling this.loadVideos,
      and if the done button was clicked, we reload this.state.currentVideo.
    */
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const videoElement = document.getElementById('video');
    const body = {
      timeinvideo: videoElement.currentTime,
      finished: doneClicked || currentVideo.finished
    };
    // update SQL database
    return axios
      .put(`/api/videos/checkpoints/${currentVideo.id}`, body, config)
      .then(res => {
        if (res.data === 'not a tracking user') {
          return;
        }
        if (reloadVideos) {
          this.loadVideos(doneClicked ? this.getCurrentVideo : null);
        }
      })
      .catch(error => {
        console.log('Error in put api/videos/checkpoints');
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
        if (!error.response) {
          return;
        }
        const errMsg =
          error.response.data.detail || error.response.data.message || 'Error';
        console.log(errMsg);
        this.setState({
          error: errMsg
        });
      });
  };

  handleDoneClick = async () => {
    const { socket } = this.state;
    // update video checkpoint to watched
    await this.updateCheckpoint(true, true);
    socket.emit('refresh videos');
  };

  handleVideoClick = async clickedVideo => {
    const { socket, currentVideo } = this.state;
    socket.emit('refresh videos');
    this.setState(
      {
        currentVideo: clickedVideo
      },
      async () => {
        const videoElement = document.getElementById('video');
        videoElement.currentTime = currentVideo.timeinvideo;
        await this.updateCheckpoint(false, true);
        socket.emit('refresh videos');
      }
    );
  };

  postAnnotation = (comment, unsure) => {
    const { x, y, width, height, clickedConcept, currentVideo } = this.state;
    const videoElement = document.getElementById('video');
    const cTime = videoElement.currentTime;

    const dragBox = document.getElementById('dragBox');

    if (dragBox === null) {
      Swal.fire({
        title: 'Error',
        text: 'No bounding box exists.',
        type: 'error',
        confirmButtonText: 'Okay'
      });
      return;
    }

    const vidCord = videoElement.getBoundingClientRect();

    // Make video image
    const canvas = document.createElement('canvas');
    canvas.height = vidCord.height;
    canvas.width = vidCord.width;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const videoImage = new window.Image();
    videoImage.setAttribute('crossOrigin', 'use-credentials');
    videoImage.src = canvas.toDataURL(1.0);

    // Bouding box coordinates
    const x1 = Math.max(x, 0);
    const y1 = Math.max(y, 0);
    const x2 = Math.min(x1 + parseInt(width, 0), 1599);
    const y2 = Math.min(y1 + parseInt(height, 0), 899);

    // draw video with and without bounding box to canvas and save as img
    const date = Date.now().toString();

    const body = {
      conceptId: clickedConcept.id,
      videoId: currentVideo.id,
      timeinvideo: cTime,
      x1,
      y1,
      x2,
      y2,
      videoWidth: 1600,
      videoHeight: 900,
      image: date,
      comment,
      unsure
    };
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .post('/api/annotations', body, config)
      .then(async res => {
        console.log(res.data.message);
        Swal.fire({
          type: 'success',
          title: res.data.message
        });
        this.handleDialogClose();
        this.uploadImage(videoImage, date);
      })
      .catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
        if (!error.response) {
          return;
        }
        const errMsg =
          error.response.data.detail || error.response.data.message || 'Error';
        console.log(errMsg);
        this.setState({
          error: errMsg
        });
      });
  };

  uploadImage = (img, date) => {
    const buf = Buffer.from(
      img.src.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    );
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      buf,
      date
    };
    return axios.post('/api/annotations/images', body, config).catch(error => {
      console.log(error);
    });
  };

  handleConceptClick = concept => {
    const { currentVideo } = this.state;
    const videoElement = document.getElementById('video');
    this.setState({
      dialogMsg: `${concept.name} in video ${
        currentVideo.filename
      } at time ${Math.floor(
        videoElement.currentTime / 60
      )} minutes ${videoElement.currentTime % 60} seconds`,
      dialogOpen: true,
      clickedConcept: concept
    });
  };

  handleDialogClose = () => {
    this.setState({
      dialogOpen: false,
      dialogMsg: null,
      clickedConcept: null
    });
  };

  render() {
    const { classes } = this.props;
    const {
      isLoaded,
      error,
      socket,
      currentVideo,
      startedVideos,
      unwatchedVideos,
      watchedVideos,
      inProgressVideos,
      videoPlaybackRate,
      width,
      height,
      x,
      y,
      dialogOpen,
      dialogMsg
    } = this.state;
    const dragBox = document.getElementById('dragBox');
    if (!isLoaded) {
      return <Typography className={classes.text}>Loading...</Typography>;
    }
    if (error) {
      return <Typography className={classes.text}>Error: {error}</Typography>;
    }
    return (
      <>
        <Hotkeys keyName="space, right, left" onKeyDown={this.handleKeyDown} />
        <Grid container spacing={0}>
          <Grid item xs>
            <VideoList
              handleVideoClick={this.handleVideoClick}
              startedVideos={startedVideos}
              unwatchedVideos={unwatchedVideos}
              watchedVideos={watchedVideos}
              inProgressVideos={inProgressVideos}
              socket={socket}
              loadVideos={this.loadVideos}
            />
          </Grid>
          <Grid item xs={8}>
            <Typography
              variant="h5"
              align="center"
              className={classes.videoName}
            >
              {`${currentVideo.id} ${currentVideo.filename}`}
            </Typography>
          </Grid>
          <Grid item xs>
            <ConceptsSelected
              dragBox={dragBox}
              handleConceptClick={this.handleConceptClick}
            />
          </Grid>
        </Grid>
        <Grid container spacing={0}>
          <Grid item xs={1} />
          <Grid item xs>
            <DragBoxContainer
              videoHeight="900"
              videoWidth="1600"
              dragBox={classes.dragBox}
              drawDragBoxProp={false}
              size={{
                width,
                height
              }}
              position={{ x, y }}
              onDragStop={(e, d) => {
                this.setState({ x: d.x, y: d.y });
              }}
              onResize={(e, direction, ref, delta, position) => {
                this.setState({
                  width: ref.style.width,
                  height: ref.style.height,
                  ...position
                });
              }}
            >
              <video
                onPause={() => this.updateCheckpoint(false, true)}
                id="video"
                width="1600"
                height="900"
                src={`https://cdn.deepseaannotations.com/videos/${currentVideo.filename}`}
                type="video/mp4"
                crossOrigin="use-credentials"
              >
                Your browser does not support the video tag.
              </video>
            </DragBoxContainer>
          </Grid>
          <Grid item xs />
        </Grid>
        <Grid container className={classes.root} spacing={0}>
          <Grid item xs={1} />
          <Grid item xs={6}>
            <div
              style={{
                float: 'left'
              }}
            >
              <Slider
                style={{
                  width: 200
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
              color="primary"
              variant="contained"
              className={classes.button}
              onClick={() => Annotate.skipVideoTime(-5)}
            >
              -5 sec
            </Button>
            <Button
              color="primary"
              variant="contained"
              className={classes.button}
              onClick={Annotate.playPause}
            >
              Play/Pause
            </Button>
            <Button
              color="primary"
              variant="contained"
              className={classes.button}
              onClick={() => Annotate.skipVideoTime(5)}
            >
              +5 sec
            </Button>
            <Button
              color="primary"
              variant="contained"
              className={classes.button}
              onClick={() => Annotate.toggleVideoControls()}
            >
              Toggle Controls
            </Button>
            <Button
              style={{ float: 'right' }}
              color="primary"
              variant="contained"
              className={classes.button}
              onClick={() => this.handleDoneClick()}
            >
              Done
            </Button>
          </Grid>
          <Grid item xs />
        </Grid>
        {dialogOpen && (
          <DialogModal
            title="Confirm Annotation"
            message={dialogMsg}
            placeholder="Comments"
            comment=""
            inputHandler={this.postAnnotation}
            open
            handleClose={this.handleDialogClose}
          />
        )}
      </>
    );
  }
}

export default withStyles(styles)(Annotate);

import React, { Component } from 'react';
import Rnd from 'react-rnd';
import axios from 'axios';
import io from 'socket.io-client';

import ConceptsSelected from './ConceptsSelected.jsx';
import VideoList from './VideoList.jsx';
import DialogModal from './DialogModal.jsx';

import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  boxContainer: {
    postion: 'absolute',
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
  conceptSectionContainer: {
    position: 'relative',
    float: 'right',
    width: '460px',
    height: '1000px',
    backgroundColor: 'white',
    borderLeft: '1px black solid',
    overflow: 'auto'
  },
  videoSectionContainer: {
    float: 'left'
  },
});

class Annotate extends Component {
  constructor(props) {
    super(props);

    const socket = io();
    // const socket = io({transports: ['polling']});
    // ^ this works arrrghhh
    socket.on('connect', () => {
      console.log('socket connected!');
    });
    socket.on('reconnect_attempt', (attemptNumber) => {
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
      closeHandler: null,
      isLoaded: false,
      startedVideos: [],
      unwatchedVideos: [],
      watchedVideos: [],
      inProgressVideos: [],
      videoPlaybackRate: 1.0,
      error: null,
      socket: socket
    };
  }

  componentDidMount = async () => {
    // add event listener for closing window
    window.addEventListener("beforeunload", (ev) => {
      var videoElement = document.getElementById("video");
      if (!videoElement.paused) {
        ev.preventDefault();
        ev.returnValue = 'Are you sure you want to close?';
      }
    });

    // adds event listener for different key presses
    document.addEventListener('keydown', this.handleKeyDown);

    try {
      this.loadVideos(this.getCurrentVideo);
    } catch (error) {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      let errMsg = error.response.data.detail ||
        error.response.data.message || 'Error';
      console.log(errMsg);
      this.setState({
        isLoaded: true,
        error: errMsg
      });
    }
  }

  componentWillUnmount = () => {
    this.updateCheckpoint(false, false);
    this.state.socket.disconnect();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (e) => {
    if (e.target !== document.body) {
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      this.playPause();
    }
    if (e.code === "ArrowRight") {
      e.preventDefault();
      this.skipVideoTime(1);
    }
    if (e.code === "ArrowLeft") {
      e.preventDefault();
      this.skipVideoTime(-1);
    }
  }

  skipVideoTime = (time) => {
     var videoElement = document.getElementById("video");
     var cTime = videoElement.currentTime;
     videoElement.currentTime = (cTime + time);
  }

  playPause = () => {
    var videoElement = document.getElementById("video");
    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  }

  toggleVideoControls = () => {
    var videoElement = document.getElementById("video");
    videoElement.controls = !videoElement.controls;
  }

  handleChangeSpeed = (event) => {
    this.setState({
      videoPlaybackRate: event.target.value
    }, () => {
      var videoElement = document.getElementById("video");
      videoElement.playbackRate = this.state.videoPlaybackRate;
    });
  }

  loadVideos = (callback) => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    return axios.get('/api/videos', config).then(res => {
      this.setState({
        startedVideos: res.data[0].rows,
        unwatchedVideos: res.data[1].rows,
        watchedVideos: res.data[2].rows,
        inProgressVideos: res.data[3].rows
      }, callback);
    });
  }

  getCurrentVideo = () => {
    // if user does not have a video to be played, return default video 1
    let currentVideo = {
      'id': 1,
      'filename': 'DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4',
      'timeinvideo': 0,
      'finished': true
    };
    if (this.state.startedVideos.length > 0) {
      // currentVideo is the first item in startedVideos
      currentVideo = this.state.startedVideos[0];
    } else if (this.state.unwatchedVideos.length > 0) {
      // currentVideo is the first item in unwatchedVideos
      currentVideo = this.state.unwatchedVideos[0]
    }
    this.setState({
      currentVideo: currentVideo,
      isLoaded: true,
    }, () => {
      var videoElement = document.getElementById("video");
      videoElement.currentTime = this.state.currentVideo.timeinvideo;
      this.updateCheckpoint(false, true);
    });
  }

  updateCheckpoint = (finished, updateComponent) => {
    // if the currentVideo is finished, this means that it is a video from the
    // global watchedVideos list. We don't want to create checkpoints for these
    // videos.
    if (this.state.currentVideo.finished) {
      console.log("currentVideo is finished, so no new checkpoint created");
      return;
    }
    // when the checkpoint for a video is updated, there are three places that
    // need to reflect this: this.state.currentVideo, this.state.startedVideos,
    // and the checkpoints table in the SQL database. Upon successful resolution
    // of the SQL database update, we update currentVideo and startedVideos.
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    let videoElement = document.getElementById("video");
    const body = {
      'videoId': this.state.currentVideo.id,
      'timeinvideo': videoElement.currentTime,
      'finished' : finished
    }
    // update SQL database
    return axios.put('/api/checkpoints', body, config).then(res => {
      if (updateComponent) {
        return this.loadVideos(finished ? this.getCurrentVideo : null);
      }
    }).catch(error => {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      let errMsg = error.response.data.detail ||
        error.response.data.message || 'Error';
      console.log(errMsg);
      this.setState({
        error: errMsg
      });
    });
  };

  handleDoneClick = async () => {
    // update video checkpoint to watched
    await this.updateCheckpoint(true, true);
    this.state.socket.emit('refresh videos');
  }

  handleVideoClick = async (clickedVideo, videoListName) => {
    await this.updateCheckpoint(false, true);
    this.setState({
      currentVideo: clickedVideo,
    }, async () => {
      var videoElement = document.getElementById("video");
      videoElement.currentTime = this.state.currentVideo.timeinvideo;
      await this.updateCheckpoint(false, true);
      this.state.socket.emit('refresh videos');
    });
    /*
    We need to be careful when a video from watchedVideos is played by the user.
    It creates the possibility of creating duplicate checkpoints for the same
    video, as watchedVideos is a global list.
    At some point we could let users change watchedVideos into unwatchedVideos.
    */
  };

  postAnnotation = (comment, unsure) => {
    var videoElement = document.getElementById("video");
    var cTime = videoElement.currentTime;
    var dragBoxCord = document.getElementById("dragBox").getBoundingClientRect();
    var vidCord = videoElement.getBoundingClientRect("dragBox");
    var x1_video = vidCord.left;
    var y1_video = vidCord.top;

    var x1_box = dragBoxCord.left;
    var y1_box = dragBoxCord.top;
    var height = dragBoxCord.height;
    var width = dragBoxCord.width;

    var x1 = Math.max((x1_box - x1_video),0);
    var y1 = Math.max((y1_box - y1_video),0);
    var x2 = Math.min((x1 + width),1599);
    var y2 = Math.min((y1 + height),899);

    //draw video with and without bounding box to canvas and save as img
    var date = Date.now().toString();

    const body = {
      'conceptId': this.state.clickedConcept.id,
      'videoId': this.state.currentVideo.id,
      'timeinvideo': cTime,
      'x1': x1,
      'y1': y1,
      'x2': x2,
      'y2': y2,
      'videoWidth': 1600,
      'videoHeight': 900,
      'image': date,
      'imagewithbox': date + "_box",
      'comment': comment,
      'unsure' : unsure
    };
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    axios.post('/api/annotations', body, config).then(async res => {
      console.log(res.data.message);
      this.handleDialogClose();
      this.createAndUploadImages(vidCord, dragBoxCord, videoElement, date, x1, y1);
    }).catch(error => {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      let errMsg = error.response.data.detail ||
        error.response.data.message || 'Error';
      console.log(errMsg);
      this.setState({
        error: errMsg
      });
    });
  }

  createAndUploadImages = async (vidCord, dragBoxCord, videoElement, date,
     x1, y1) => {
    var canvas = document.createElement('canvas');
    canvas.height = vidCord.height;
    canvas.width = vidCord.width;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    var img = new Image();
    img.setAttribute('crossOrigin', 'use-credentials');
    img.src = canvas.toDataURL(1.0);
    await this.uploadImage(img, date, false);
    ctx.lineWidth = "2";
    ctx.strokeStyle = "coral";
    ctx.rect(x1, y1, dragBoxCord.width, dragBoxCord.height);
    ctx.stroke();
    img.src = canvas.toDataURL(1.0);
    await this.uploadImage(img, date, true);
  }

  uploadImage = (img, date, box) => {
    let buf = new Buffer(
      img.src.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    const body = {
      'buf': buf,
      'date': date,
      'box': box
    };
    return axios.post('/api/annotationImages', body, config);
  }

  handleConceptClick = (concept) => {
    var videoElement = document.getElementById("video");
    this.setState({
      dialogMsg:
        concept.name +
        " in video " + this.state.currentVideo.filename +
        " at time " + Math.floor(videoElement.currentTime/60) + ' minutes '
        + videoElement.currentTime%60 + " seconds",
      dialogOpen: true,
      clickedConcept: concept,
      closeHandler: this.handleDialogClose
    })
  };

  handleDialogClose = () => {
    this.setState({
      dialogOpen: false,
      dialogMsg: null,
      clickedConcept: null,
    });
  }

  render() {
    const { classes } = this.props;
    const { isLoaded, error } = this.state;
    if (!isLoaded) {
      return <div>Loading...</div>
    }
    if (error)  {
      return <div>Error: {error}</div>;
    }
    return (
      <React.Fragment>
        <ConceptsSelected
          className = {classes.conceptSectionContainer}
          handleConceptClick={this.handleConceptClick}
        />
        <VideoList
          handleVideoClick={this.handleVideoClick}
          startedVideos={this.state.startedVideos}
          unwatchedVideos={this.state.unwatchedVideos}
          watchedVideos={this.state.watchedVideos}
          inProgressVideos={this.state.inProgressVideos}
        />
        <div className = {classes.videoSectionContainer}>
          {this.state.currentVideo.id + " " + this.state.currentVideo.filename}
          <div className = {classes.boxContainer}>
            <video
              onPause={() => this.updateCheckpoint(false, true)}
              id="video"
              width="1600"
              height="900"
              src={'https://d1bnpmj61iqorj.cloudfront.net/videos/'+
                this.state.currentVideo.filename}
              type='video/mp4'
              crossOrigin='use-credentials'
              >
              Your browser does not support the video tag.
            </video>
            <Rnd id="dragBox"
              default={{
                x: 30,
                y: 30,
                width: 60,
                height: 60,
              }}
              minWidth={25}
              minHeight={25}
              maxWidth={900}
              maxHeight={650}
              bounds="parent"
              className={classes.dragBox}
              >
            </Rnd>
          </div>
          <br />
          <Button variant="contained" color="primary"
            className={classes.button}
            onClick={() => this.skipVideoTime(-5)}>-5 sec
          </Button>
          <Button variant="contained" color="primary"
            className={classes.button}
            onClick={this.playPause}>Play/Pause
            </Button>
          <Button variant="contained" color="primary"
            className={classes.button}
            onClick={() => this.skipVideoTime(5)}>+5 sec
          </Button>
          <Button variant="contained" color="primary"
            className={classes.button}
            onClick={() => this.toggleVideoControls()}>Toggle Controls
          </Button>
          <Button variant="contained" color="primary"
            className={classes.button}
            onClick={() => this.handleDoneClick()}>Done
          </Button>
          <br />
          <div width="250">
            Play Rate: {this.state.videoPlaybackRate}
          </div>
          <input
            type="range"
            id="playSpeedId"
            min="0" max="4"
            value={this.state.videoPlaybackRate}
            onChange={this.handleChangeSpeed}
            step=".1"
          />
        </div>
        {this.state.dialogOpen &&
          <DialogModal
            title={"Confirm Annotation"}
            message={this.state.dialogMsg}
            placeholder={"Comments"}
            inputHandler={this.postAnnotation}
            open={true /* The DialogModal 'openness' is controlled through
              boolean logic rather than by passing in a variable as an
              attribute. This is to force DialogModal to unmount when it closes
              so that its state is reset. This also prevents the accidental
              double submission bug, by implicitly reducing the transition time
              of DialogModal to zero. */}
            handleClose={this.state.closeHandler}
          />
        }
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(Annotate);

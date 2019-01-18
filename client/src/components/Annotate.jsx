import React, { Component } from 'react';
import Rnd from 'react-rnd';
import axios from 'axios';

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

window.addEventListener("beforeunload", (ev) => {
  var videoElement = document.getElementById("video");
  if (!videoElement.paused) {
    ev.preventDefault();
    return ev.returnValue = 'Are you sure you want to close?';
  }
});

class Annotate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentVideo: null,
      dialogMsg: null,
      dialogTitle: null,
      dialogPlaceholder: null,
      dialogOpen: false,
      clickedConcept: null,
      closeHandler: null,
      isLoaded: false,
      startedVideos: [],
      unwatchedVideos: [],
      watchedVideos: [],
      videoPlaybackRate: 1.0
    };
  }

  getCurrentVideo = () => {
    if (this.state.startedVideos.length > 0) {
      // currentVideo is the first item in startedVideos
      let currentVideo = this.state.startedVideos[0];
      return currentVideo;
    }
    if (this.state.unwatchedVideos.length > 0) {
      // currentVideo is the first item in unwatchedVideos
      let currentVideo = this.state.unwatchedVideos[0]
      // remove from unwatched list
      let unwatchedVideos = JSON.parse(JSON.stringify(this.state.unwatchedVideos));
      unwatchedVideos = unwatchedVideos.filter(vid => vid.id !== currentVideo.id);
      // Add unwatched video to current videos
      let startedVideos = JSON.parse(JSON.stringify(this.state.startedVideos));
      startedVideos = startedVideos.concat(currentVideo);
      this.setState({
        startedVideos: startedVideos,
        unwatchedVideos: unwatchedVideos
      });
      return currentVideo;
    }
    // user does not have a video to be played
    // return default video 1
    return {
      'id': 1,
      'filename': 'DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4',
      'timeinvideo': 0,
      'finished': true
    };
  }

  componentDidMount = async () => {

    // adds event listeners for different key presses
    document.addEventListener('keydown', this.handleKeyDown);

    // loading the video list data
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };

    try {
      await axios.get('/api/listVideos/', config).then(res => {
        this.setState({
          startedVideos: res.data[0].rows,
          unwatchedVideos: res.data[1].rows,
          watchedVideos: res.data[2].rows,
        });
      })
    } catch (error) {
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
      return;
    }

    // retrieve the current video and put it in the state
    this.setState({
      currentVideo: this.getCurrentVideo(),
      isLoaded: true,
    }, () => {
      var videoElement = document.getElementById("video");
      videoElement.currentTime = this.state.currentVideo.timeinvideo;
    });
  }

  componentWillUnmount = () => {
     this.updateCheckpoint(false);
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
      this.skipVideoTime(1);
    }
    if (e.code === "ArrowLeft") {
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

  updateCheckpoint = async (finished) => {
    // when the checkpoint for a video is updated,
    // there are three places that need to reflect this: this.state.currentVideo,
    // this.state.startedVideos, and the checkpoints table in the SQL database
    // upon successful resolution of the SQL database update, we update
    // currentVideo and startedVideos

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
    await axios.post('/api/updateCheckpoint', body, config).then(res => {
      if (res.data.message !== "updated") {
        console.log(res.data.message);
      }

      // update this.state.startedVideos
      let startedVideos = JSON.parse(JSON.stringify(this.state.startedVideos));
      let currentVideo = startedVideos.find(vid => vid.id === this.state.currentVideo.id)
      currentVideo.timeinvideo = videoElement.currentTime;
      currentVideo.finished = finished;

      this.setState({
        // update this.state.currentVideo
        currentVideo: JSON.parse(JSON.stringify(currentVideo)),
        startedVideos: startedVideos
      });
    }, error => {
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    });
  };

  handleDoneClick = async () => {
    //Update video checkpoint to watched
    await this.updateCheckpoint(true);

    // remove currentVideo from startedVideos, add to watchedVideos
    let startedVideos = JSON.parse(JSON.stringify(this.state.startedVideos));
    startedVideos = startedVideos.filter(vid => vid.id !== this.state.currentVideo.id);
    let watchedVideos = JSON.parse(JSON.stringify(this.state.watchedVideos));
    if (!watchedVideos.some(vid => vid.id === this.state.currentVideo.id)) {
      watchedVideos = watchedVideos.concat(this.state.currentVideo);
    }
    this.setState({
      startedVideos: startedVideos,
      watchedVideos: watchedVideos
    });

    //Get next video and play it
    let currentVideo = await this.getCurrentVideo();
    this.setState({
      currentVideo: currentVideo,
    });
  }

  handleChangeSpeed = (event) => {
    this.setState({
      videoPlaybackRate: event.target.value
    }, () => {
      var videoElement = document.getElementById("video");
      videoElement.playbackRate = this.state.videoPlaybackRate;
    });
  }

  handleVideoClick = async (clickedVideo, videoListName) => {

    await this.updateCheckpoint(this.state.currentVideo.finished);
    /*
    If an unwatched video was clicked, remove it from unwatchedVideos and add it
    to startedVideos
    If a current video or watched video was clicked, do nothing
    */
    if (videoListName === 'unwatchedVideos') {
      let unwatchedVideos = JSON.parse(JSON.stringify(this.state.unwatchedVideos));
      unwatchedVideos = unwatchedVideos.filter(vid => vid.id !== clickedVideo.id);
      let startedVideos = JSON.parse(JSON.stringify(this.state.startedVideos));
      startedVideos = startedVideos.concat(clickedVideo);
      this.setState({
        startedVideos: startedVideos,
        unwatchedVideos: unwatchedVideos
      });
    }

    /*
    Right now our database's architecture requires that watchedVideos never be
    played by the end user. Talk to Ishaan or Hanson for more details on this.
    It's interesting, I promise.
    Down the road, one solution is to change our database's architecture, which
    might be kinda hard. Another solution is to let end users change
    watchedVideos into unwatchedVideos.
    */
    if (videoListName === 'unwatchedVideos' || videoListName === 'startedVideos') {
      this.setState({
        currentVideo: clickedVideo,
      })
      var videoElement = document.getElementById("video");
      videoElement.currentTime = clickedVideo.timeinvideo;
    }
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
      'conceptId': this.state.clickedConcept.name,
      'videoFilename': this.state.currentVideo.filename,
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
    axios.post('/api/annotate', body, config).then(async res => {
      console.log(res.data.message);
      this.handleDialogClose();
      this.createAndUploadImages(vidCord, dragBoxCord, videoElement, date, x1, y1);
    }).catch(error => {
      console.log(error);
      console.log(JSON.stringify(error));
      if (error.response) {
        console.log(error.response.data.detail);
      }
    });
  }

  createAndUploadImages = async (vidCord, dragBoxCord, videoElement, date, x1, y1) => {
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
    let buf = new Buffer(img.src.replace(/^data:image\/\w+;base64,/, ""),'base64');
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
    return axios.post('/api/uploadImage', body, config);
  }

  handleConceptClick = (concept) => {
    var videoElement = document.getElementById("video");
    this.setState({
      dialogMsg:  concept.name +
                  " in video " + this.state.currentVideo.filename +
                  " at time " + Math.floor(videoElement.currentTime/60) + ' minutes '
                  + videoElement.currentTime%60 + " seconds",
      dialogOpen: true,
      dialogTitle: "Confirm Annotation",
      dialogPlaceholder: "Comments",
      clickedConcept: concept,
      closeHandler: this.handleDialogClose
    })
  };

  handleDialogClose = () => {
    this.setState({
      dialogOpen: false,
      dialogMsg: null,
      dialogPlaceholder: null,
      dialogTitle: "", //If set to null, raises a warning to the console
      clickedConcept: null,
    });
  }

  render() {
    const { classes } = this.props;
    const { isLoaded } = this.state;
    if (!isLoaded) {
      return <div>Loading...</div>
    }
    return (
      <React.Fragment>
        <DialogModal
          title={this.state.dialogTitle}
          message={this.state.dialogMsg}
          placeholder={this.state.dialogPlaceholder}
          inputHandler={this.postAnnotation}
          open={this.state.dialogOpen}
          handleClose={this.state.closeHandler}
        />
      <div className = {classes.videoSectionContainer}>
        {this.state.currentVideo.id + " " + this.state.currentVideo.filename}
        <div className = {classes.boxContainer}>
          <video
              onPause={this.updateCheckpoint.bind(this, false)}
              id="video"
              width="1600"
              height="900"
              src={'https://d1bnpmj61iqorj.cloudfront.net/videos/'+this.state.currentVideo.filename}
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
        <Button variant="contained" color="primary" className={classes.button} onClick={() => this.skipVideoTime(-5)}>-5 sec</Button>
        <Button variant="contained" color="primary" className={classes.button} onClick={this.playPause}>Play/Pause</Button>
        <Button variant="contained" color="primary" className={classes.button} onClick={() => this.skipVideoTime(5)}>+5 sec</Button>
        <Button variant="contained" color="primary" className={classes.button} onClick={() => this.toggleVideoControls()}>Toggle Controls</Button>
        <Button variant="contained" color="primary" className={classes.button} onClick={() => this.handleDoneClick()}>Done</Button>
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
        <ConceptsSelected
          className = {classes.conceptSectionContainer}
          handleConceptClick={this.handleConceptClick}
        />
        <VideoList
          handleVideoClick={this.handleVideoClick}
          startedVideos={this.state.startedVideos}
          unwatchedVideos={this.state.unwatchedVideos}
          watchedVideos={this.state.watchedVideos}
        />
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(Annotate);

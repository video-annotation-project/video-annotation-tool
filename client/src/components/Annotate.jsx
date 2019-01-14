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
  var myVideo = document.getElementById("video");
  if (!myVideo.paused) {
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

  getCurrentVideo = async () => {
    if (this.state.startedVideos.length > 0) { // user has current videos
      // current video
      let currentTime = await this.getVideoStartTime(this.state.startedVideos[0].filename);
      return {
        video: this.state.startedVideos[0],
        time: currentTime
      };
    }
    if (this.state.unwatchedVideos.length > 0) { // they have unwatched videos
      let video = this.state.unwatchedVideos[0]
      // remove from unwatched list
      let unwatchedVideos = JSON.parse(JSON.stringify(this.state.unwatchedVideos));
      unwatchedVideos = unwatchedVideos.filter(vid => vid.id !== video.id);
      // Add unwatched video to current videos
      let startedVideos = JSON.parse(JSON.stringify(this.state.startedVideos));
      startedVideos = startedVideos.concat(video);
      this.setState({
        startedVideos: startedVideos,
        unwatchedVideos: unwatchedVideos
      });
      return {
        video: video,
        time: 0
      };
    }
    // they dont have a video to be played returns default video 1
    return {
      video: {'id': 1, 'filename': 'DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4'},
      time: 0
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
    }

    // retrieves the last watched video
    let currentVideo = await this.getCurrentVideo();
    this.setState({
      currentVideo: currentVideo.video,
      isLoaded: true,
    }, () => {
      var myVideo = document.getElementById("video");
      myVideo.currentTime = currentVideo.time;
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
     var myVideo = document.getElementById("video");
     var cTime = myVideo.currentTime;
     myVideo.currentTime = (cTime + time);
  }

  playPause = () => {
    var myVideo = document.getElementById("video");
    if (myVideo.paused) {
      myVideo.play();
    } else {
      myVideo.pause();
    }
  }

  toggleVideoControls = () => {
    var video = document.getElementById("video");
    if (video.hasAttribute("controls")) {
      video.removeAttribute("controls")
    } else {
      video.setAttribute("controls","controls")
    }
  }

  updateCheckpoint = async (finished) => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    var myVideo = document.getElementById("video");
    var time = myVideo.currentTime;
    /*
      If video is watched reset the time to 0
      So in the future if a watched video is clicked
      it will play from the begining
    */
    if (finished) {
      time = 0;
    }
    const body = {
      'videoName': this.state.currentVideo.filename,
      'timeinvideo': time,
      'finished' : finished
    }
    await axios.post('/api/updateCheckpoint', body, config).then(res => {
      if (res.data.message !== "updated") {
        console.log(res.data.message);
      }
    }).catch(error => {
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    })
  };

  handleDoneClick = async () => {
    //Update video checkpoint to watched
    await this.updateCheckpoint(true);

    // Handle remove from current list, add to watched list
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
      currentVideo: currentVideo.video,
    });
  }

  handleChangeSpeed = (event) => {
    this.setState({
      videoPlaybackRate: event.target.value
    }, () => {
      var myVideo = document.getElementById("video");
      myVideo.playbackRate = this.state.videoPlaybackRate;
    });
  }

  getVideoStartTime = async (filename) => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    try {
      let videoTime = await axios.get(`/api/videos/currentTime/${filename}`, config);
      if (videoTime.data.length > 0) {
        return videoTime.data[0].timeinvideo;
      } else {
        return 0;
      }
    } catch (error) {
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    }
  };

  handleVideoClick = async (video, videoListName) => {

    /*
    If an unwatched video was clicked, remove it from unwatchedVideos and add it
    to startedVideos
    If a current video or watched video was clicked, do nothing
    */
    if (videoListName === 'unwatchedVideos') {
      let unwatchedVideos = JSON.parse(JSON.stringify(this.state.unwatchedVideos));
      unwatchedVideos = unwatchedVideos.filter(vid => vid.id !== video.id);
      let startedVideos = JSON.parse(JSON.stringify(this.state.startedVideos));
      startedVideos = startedVideos.concat(video);
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
        currentVideo: video,
      })
      let currentTime = await this.getVideoStartTime(video.filename);
      var myVideo = document.getElementById("video");
      myVideo.currentTime = currentTime;
    }
  };

  postAnnotation = (comment, unsure) => {
    var myVideo = document.getElementById("video");
    var cTime = myVideo.currentTime;
    var dragBoxCord = document.getElementById("dragBox").getBoundingClientRect();
    var vidCord = myVideo.getBoundingClientRect("dragBox");
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
    this.drawImages(vidCord, dragBoxCord, myVideo, date, x1, y1);

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
    }).catch(error => {
      console.log(error);
      if (error.response) {
        console.log(error.response.data);
      }
    });
  }

  drawImages = (vidCord, dragBoxCord, myVideo, date, x1, y1) => {
    var canvas = document.createElement('canvas');
    canvas.height = vidCord.height;
    canvas.width = vidCord.width;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(myVideo, 0, 0, canvas.width, canvas.height);
    var img = new Image();
    img.setAttribute('crossOrigin', 'use-credentials');
    img.src = canvas.toDataURL(1.0);
    this.putVideoImage(img, date, false);
    ctx.lineWidth = "2";
    ctx.strokeStyle = "coral";
    ctx.rect(x1, y1, dragBoxCord.width, dragBoxCord.height);
    ctx.stroke();
    img.src = canvas.toDataURL(1.0);
    this.putVideoImage(img, date, true);
  }

  putVideoImage = (img, date, box) => {
    let buf = new Buffer(img.src.replace(/^data:image\/\w+;base64,/, ""),'base64');
    const body = {
      'buf': buf,
      'date': date,
      'box': box
    }
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.post('/api/uploadImage', body, config).then(async res => {
      console.log(res.data.message);
    }).catch(error => {
      console.log(error);
      console.log(JSON.stringify(error));
      if (error.response) {
        console.log(error.response.data);
      }
    });
  }

  handleConceptClick = (concept) => {
    // Remove key listener to allow comment to be typed
    var myVideo = document.getElementById("video");
    this.setState({
      dialogMsg:  concept.name +
                  " in video " + this.state.currentVideo.filename +
                  " at time " + Math.floor(myVideo.currentTime/60) + ' minutes '
                  + myVideo.currentTime%60 + " seconds",
      dialogOpen: true,
      dialogTitle: "Confirm Annotation",
      dialogPlaceholder: "Comments",
      clickedConcept: concept,
      closeHandler: this.handleDialogClose
    })
  }

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
              src={'http://d1bnpmj61iqorj.cloudfront.net/videos/'+this.state.currentVideo.filename}
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

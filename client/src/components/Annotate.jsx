import React, { Component } from 'react';
import Rnd from 'react-rnd';
import axios from 'axios';

import ConceptsSelected from './ConceptsSelected.jsx';
import VideoList from './VideoList.jsx';
import ErrorModal from './ErrorModal.jsx';
import DialogModal from './DialogModal.jsx';

import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';


const styles = theme => ({
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
  }
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
      error: null,
      videoName: '',
      errorMsg: null,
      errorOpen: false,
      dialogMsg: null,
      dialogTitle: null,
      dialogPlaceholder: null,
      dialogOpen: false,
      clickedConcept: null,
      closeHandler: null,
      enterEnabled: true,
      isLoaded: false
    };
  }

  getCurrentVideo = async () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    let videoData = await axios.get('/api/latestWatchedVideo', config)
    if (videoData.data.length > 0) { // they've started watching a video
      let startTime = videoData.data[0].timeinvideo;
      let filename = videoData.data[0].filename;
      return {
        filename: filename,
        time: startTime
      };
    } else {
      axios.get('/api/unwatchedVideos', config).then(res => {
        if (typeof res.data.rows !== 'undefined') {
          return {
            filename: res.data.rows[0].filename,
            time: 0
          };
        } else {
          console.log('No unwatched videos found');
          return {
            filename: 'DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4',
            time: 0
          };
        }
      }).catch(error => {
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      })
    }
  }

  componentDidMount = async () => {
    let currentVideo = await this.getCurrentVideo();
    this.setState({
      videoName: currentVideo.filename,
      isLoaded: true,
    }, () => {
      var myVideo = document.getElementById("video");
      myVideo.currentTime = currentVideo.time;
    });
  }

  rewind = () => {
     var myVideo = document.getElementById("video");
     var cTime = myVideo.currentTime;
     myVideo.currentTime = (cTime - 5);
  }

  playPause = () => {
    var myVideo = document.getElementById("video");
    if (myVideo.paused) {
      myVideo.play();
    } else {
      myVideo.pause();
    }
  }

  fastForward = () => {
    var myVideo = document.getElementById("video");
    var cTime = myVideo.currentTime;
    myVideo.currentTime = (cTime + 5);
  }

  updateCheckpoint = async (finished) => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    var myVideo = document.getElementById("video");
    var time = myVideo.currentTime;
    if (finished) {
      time = 0;
    }
    const body = {
      'videoName': this.state.videoName,
      'timeinvideo': time,
      'finished' : finished
    }
    await axios.post('/api/updateCheckpoint', body, config).then(res => {
      if (res.data.message !== "updated") {
        console.log(res.data.message);
      }
    }).catch(error => {
      this.handleDialogClose();
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    })
    // show next video on resume list
    if (finished) {
      axios.get('/api/userCurrentVideos', config).then(res => {
        if (res.data.rowCount > 0) {
          this.setState({
            videoName: res.data.rows[0].filename
          }, () => {
            axios.get(`/api/timeAtVideo/${res.data.rows[0].id}`, config).then(res => {
              if (res.data.rowCount > 0) {
                var myVideo = document.getElementById("video");
                myVideo.currentTime = res.data.rows[0].timeinvideo;
              }
            }).catch(error => {
              console.log(error);
              if (error.response) {
                console.log(error.response.data.detail);
              }
            })
          })
        } else {
          // no videos on resume list, get from unwatched list
          axios.get('/api/unwatchedVideos', config).then(res => {
            if (res.data.rowCount > 0) {
              this.setState({
                videoName: res.data.rows[0].filename
              })
            } else {
              console.log('No unwatched videos found');
            }
          }).catch(error => {
            console.log(error);
            if (error.response) {
              console.log(error.response.data.detail);
            }
          })
        }
      }).catch(error => {
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      })
    }
  };

  changeSpeed = () => {
    try {
      var myVideo = document.getElementById("video");
      var speed = document.getElementById("playSpeedId").value;
      if ((speed / 100) === 0) {
        myVideo.playbackRate = (1);
      } else {
        myVideo.playbackRate = (speed / 100);
      }
    } catch(err) {
      alert("invalid input");
      myVideo.playbackRate = 1;
    }
  }

  componentWillUnmount = () => {
     this.updateCheckpoint(false);
  }

  getVideoStartTime = async (filename) => {
    let currentTime = await axios.get(`/api/videos/currentTime/${filename}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    })
    return currentTime;
  };

  handleVideoClick = async (filename) => {
    this.setState({
      videoName: filename
    })
    let currentTime = await this.getVideoStartTime(filename);
    if (currentTime.data.length === 1) {
      var myVideo = document.getElementById("video");
      myVideo.currentTime = currentTime.data[0].timeinvideo;
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
      'videoId': this.state.videoName,
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
        this.setState({
          errorMsg: error.response.data,
          errorOpen: true
        });
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

  putVideoImage = async (img, date, box) => {
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
  var myVideo = document.getElementById("video");
  this.setState({
    dialogMsg:  concept.name +
                " in video " + this.state.videoName +
                " at time " + Math.floor(myVideo.currentTime/60) + ' minutes '
                + myVideo.currentTime%60 + " seconds",
    dialogOpen: true,
    dialogTitle: "Confirm Annotation",
    dialogPlaceholder: "Comments",
    clickedConcept: concept,
    enterEnabled: true,
    closeHandler: this.handleDialogClose
  })
}

  handleErrorClose = () => {
    this.setState({ errorOpen: false });
  }

  handleDialogClose = () => {
    this.setState({
      enterEnabled: false,
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
        <ErrorModal
          errorMsg={this.state.errorMsg}
          open={this.state.errorOpen}
          handleClose={this.handleErrorClose}/>
        <DialogModal
          title={this.state.dialogTitle}
          message={this.state.dialogMsg}
          placeholder={this.state.dialogPlaceholder}
          inputHandler={this.postAnnotation}
          open={this.state.dialogOpen}
          handleClose={this.state.closeHandler}
          enterEnabled={this.state.enterEnabled}
        />
        {this.state.videoName}

        <div>
          <video
              onPause={this.updateCheckpoint.bind(this, false)}
              id="video"
              width="1600"
              height="900"
              src={'api/videos/Y7Ek6tndnA/'+this.state.videoName}
              type='video/mp4'
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
          <br />
          <Button variant="contained" color="primary" className={classes.button} onClick={this.rewind}>-5 sec</Button>
          <Button variant="contained" color="primary" className={classes.button} onClick={this.playPause}>Play/Pause</Button>
          <Button variant="contained" color="primary" className={classes.button} onClick={this.fastForward}>+5 sec</Button>
          <Button variant="contained" color="primary" className={classes.button} onClick={() => this.updateCheckpoint(true)}>Done</Button>
          <br />
          <span>Play at speed:</span>
          <p><input type="text" id="playSpeedId" placeholder="100" />&ensp; %</p>
          <input type="submit" value="Enter" onClick={this.changeSpeed} />
        </div>
        <ConceptsSelected
          handleConceptClick={this.handleConceptClick}
        />
        <VideoList
          handleVideoClick={this.handleVideoClick}
        />
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(Annotate);

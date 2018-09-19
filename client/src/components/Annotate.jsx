import React, { Component } from 'react';
import Rnd from 'react-rnd';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import CurrentConcepts from './CurrentConcepts.jsx';
import VideoList from './VideoList.jsx';
import ErrorModal from './ErrorModal.jsx';
import List from '@material-ui/core/List';
import axios from 'axios';
import AWS from 'aws-sdk';

const styles = theme => ({
  clear: {
    clear: 'both'
  },
  videoSectionContainer: {
    width: '1280px',
    margin: '0 auto',
    marginTop: '20px',
    float: 'left'
  },
  videoContainer: {
    float: 'left',
    marginLeft: '15px'
  },
  boxContainer: {
    postion: 'absolute',
    top: '50px',
    border: '1px black solid',
    width: '1280px',
    height: '720px'
  },
  playButton: {
    marginTop: '40px',
    marginLeft: '20px',
    fontSize: '15px',
    paddingTop: '10px',
    paddingBottom: '10px'
  },
  forwardButton: {
    marginTop: '40px',
    marginLeft: '20px',
    fontSize: '15px',
    paddingTop: '10px',
    paddingBottom: '10px'
  },
  backwardButton: {
    marginTop: '40px',
    marginLeft: '20px',
    fontSize: '15px',
    paddingTop: '10px',
    paddingBottom: '10px'
  },
  saveButton: {
    marginTop: '40px',
    marginLeft: '20px',
    fontSize: '15px',
    paddingTop: '10px',
    paddingBottom: '10px'
  },
  doneButton: {
    marginTop: '40px',
    marginLeft: '20px',
    fontSize: '15px',
    paddingTop: '10px',
    paddingBottom: '10px'
  },
  playScript: {
    fontColor: 'black',
    fontWeight: 'bold',
    fontSize: '130%',
    position: 'relative',
    top: '10px',
    marginLeft: '10px',
    clear: 'both'
  },
  playSpeed: {
    position: 'relative',
    left: '10px',
    width: '50px'
  },
  entered: {
    marginLeft: '10px',
    position: 'relative',
    top: '-3px'
  },
  conceptSectionContainer: {
    position: 'relative',
    float: 'right',
    width: '440px',
    height: '1000px',
    backgroundColor: 'white',
    borderLeft: '1px black solid',
    overflow: 'auto'
  },
  conceptsText: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '200%',
    marginTop: '10px',
    marginLeft: '10px'
  },
  dragBox: {
    margin: '0px',
    backgroundColor: 'transparent',
    border: '2px coral solid',
    borderStyle: 'ridge'
  },
  videoListContainer: {
    position: 'relative',
    float: 'right',
    width: '400px',
    height: '1000px',
    backgroundColor: 'white',
    borderLeft: '1px black solid',
    overflow: 'auto'
  },
  videoListText: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '200%',
    marginTop: '10px',
    marginLeft: '10px'
  },
  name: {
    display: 'inline',
    float: 'left'
  },
});

AWS.config.update(
  {
    accessKeyId: "AKIAIJRSQPH2BGGCEFOA",
    secretAccessKey: "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",
    region: 'us-west-1',
  }
);

function changeSpeed() {
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

function playPause() {
   var myVideo = document.getElementById("video");
   if(myVideo.paused) {
      myVideo.play();
   } else {
      myVideo.pause();
   }
}

function fastForward() {
   var myVideo = document.getElementById("video");
   var cTime = myVideo.currentTime;
   myVideo.currentTime = (cTime + 5);
}

function rewind() {
   var myVideo = document.getElementById("video");
   var cTime = myVideo.currentTime;
   myVideo.currentTime = (cTime - 5);
}


class Annotate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      videoName: 'DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4',
      errorMsg: null,
      conceptsSelected: {},
      open: false //For error modal box
    };
  }

  getSelectedConcepts = async () => {
    return axios.get('/api/conceptsSelected', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => res.data)
      .catch(error => {
        this.setState({
          isloaded: true,
          error: error
        });
    })
  };

  makeObject = async (selectedConcepts) => {
    let temp = {}
    selectedConcepts.forEach(concept => {
      temp[concept.conceptid] = true;
    })
    return temp;
  }

  componentDidMount = async () => {
    let selectedConcepts = await this.getSelectedConcepts();
    let temp = await this.makeObject(selectedConcepts);
    let currentVideo = await this.getCurrentVideo();
    await this.setState({
      videoName: currentVideo.filename,
      conceptsSelected: temp,
      isLoaded: true,
    });
    var myVideo = document.getElementById("video");
    myVideo.currentTime = currentVideo.time;
  }

  updateCheckpoint = (finished) => {
    var myVideo = document.getElementById("video");
    var time = myVideo.currentTime;
    if (finished) {
      time = 0;
    }
    if (time > 0 || finished) {
      fetch('/updateCheckpoint', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
        body: JSON.stringify({
          'videoId': this.state.videoName,
          'timeinvideo': time,
          'finished' : finished
        })
      }).then(res => res.json())
      .then(res => {
        if (res.message !== "updated") {
          console.log("error");
        }
      })
    }
  }

  componentWillUnmount = () => {
     this.updateCheckpoint(false);
  }

  getCurrentVideo = async() => {
    let videoData = await axios.get('/api/latestVideoId', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    })
    if (videoData.data.length > 0) { // they've started watching a video
      let videoid = videoData.data[0].videoid;
      let startTime = videoData.data[0].timeinvideo;
      let filename = await axios.get(`/api/latestVideoName/${videoid}`, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
      })
      return {filename: filename.data[0].filename, time: startTime};
    }
    return {filename: 'DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4', time: 0};
  };

  getVideoStartTime = async(filename) => {
    let currentTime = await axios.get(`/api/videos/currentTime/${filename}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    })
    return currentTime;
  };

  handleVideoClick = async(filename) => {
    this.setState({
       videoName: filename
    });
    let currentTime = await this.getVideoStartTime(filename);
    if (currentTime.data.length === 1) {
       var myVideo = document.getElementById("video");
       myVideo.currentTime = currentTime.data[0].timeinvideo;
    }
  };

  handleConceptClick = (concept) => {
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
    var x2 = Math.min((x1 + width),1279);
    var y2 = Math.min((y1 + height),719);

    //id | videoid | userid | conceptid | timeinvideo | topRightx | topRighty | botLeftx | botLefty | dateannotated

    //draw video with and without bounding box to canvas and save as img
    var date = Date.now().toString();
    this.drawImages(vidCord, dragBoxCord, myVideo, date, x1, y1);

    fetch('/annotate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
      body: JSON.stringify({
        'conceptId': concept.name,
        'videoId': this.state.videoName,
        'timeinvideo': cTime,
        'x1': x1,
        'y1': y1,
        'x2': x2,
        'y2': y2,
        'videoWidth': 1280,
        'videoHeight': 720,
        'image': date,
        'imagewithbox': date + "_box",
      })
    }).then(res => res.json())
    .then(res => {
      if( res.message === "Annotated") {
        var videoInfo = JSON.parse(res.value);
        this.setState({
          errorMsg: "User: " + videoInfo.userid + " Annotated: " + concept.name + " in video " + videoInfo.videoid + " at time " + Math.floor(videoInfo.timeinvideo/60) + ' minutes '+ videoInfo.timeinvideo%60 + " seconds",
          open: true
        })
      } else {
        this.setState({
          errorMsg: res.message,
          open: true
        })
      }
    })
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
    var imgWithBox = new Image();
    imgWithBox.setAttribute('crossOrigin', 'use-credentials');
    imgWithBox.src = canvas.toDataURL(1.0);
    this.putVideoImage(imgWithBox, date, true);
  }

  putVideoImage = (img, date, box) => {
    var s3 = new AWS.S3();
    let buf = new Buffer(img.src.replace(/^data:image\/\w+;base64,/, ""),'base64');
    var key = 'test/' + date;
    if (box) {
      key += '_box';
    }
    var params = {
      Key: key,
      Bucket: 'lubomirstanchev',
      ContentEncoding: 'base64',
      ContentType: 'image/png',
      Body: buf //the base64 string is now the body
    };
    try{
      s3.putObject(params).send();
    } catch (error) {
      console.log('Error: ', error);
    }
  }

  handleClose = () => {
    this.setState({ open: false });
  };

  render() {
    const { classes } = this.props;
    return (
      <div>
         <ErrorModal errorMsg={this.state.errorMsg} open={this.state.open} handleClose={this.handleClose}/>
         <div className= {classes.name}>
          {this.state.videoName}
         </div>
         <div className = {classes.clear}></div>

         <div className = {classes.videoSectionContainer}>
            <div className = {classes.videoContainer}>
            <div className = {classes.boxContainer}>
               <video id = "video"  width = "1280" height = "720" src={'api/videos/Y7Ek6tndnA/'+this.state.videoName} type='video/mp4' controls>
               Your browser does not support the video tag.
               </video>
               <Rnd id = "dragBox"
                 default = {{
                    x: 30,
                    y: 30,
                    width: 60,
                    height: 60,
                 }}
                 minWidth = {25}
                 minHeight = {25}
                 maxWidth = {900}
                 maxHeight = {650}
                 bounds = "parent"
                 className = {classes.dragBox}
                 >
               </Rnd>

            </div>
            </div>
            <div className = {classes.clear}></div>
            <Button variant = "contained" color = "primary" className = {classes.backwardButton} onClick = {rewind}>-5 sec</Button>
            <Button variant = "contained" color = "primary" className = {classes.playButton} onClick = {playPause}>Play/Pause</Button>
            <Button variant = "contained" color = "primary" className = {classes.forwardButton} onClick = {fastForward}>+5 sec</Button>
            <Button variant = "contained" color = "primary" className = {classes.saveButton} onClick = {this.updateCheckpoint.bind(this, false)}>Save Position</Button>
            <Button variant = "contained" color = "primary" className = {classes.saveButton} onClick = {this.updateCheckpoint.bind(this, true)}>Done</Button>
            <br />
            <span className = {classes.playScript}>Play at speed:</span>
            <p><input type = "text" id = "playSpeedId" className = {classes.playSpeed} placeholder = "100" />&ensp; %</p>
            <input type = "submit" value = "Enter" className = {classes.entered} onClick = {changeSpeed} />
         </div>
            <div className = {classes.conceptSectionContainer}>
               <span className = {classes.conceptsText}>Current Concepts</span>
               <br />
               {(this.state.isLoaded) ? (
                 <CurrentConcepts handleConceptClick= {this.handleConceptClick} conceptsSelected= {this.state.conceptsSelected} />
               ):(
                 <List>Loading...</List>
               )}
            </div>
            <div className= {classes.videoListContainer}>
              <span className = {classes.videoListText}>Select Video</span>
              <br />
              <VideoList handleVideoClick = {this.handleVideoClick} />
            </div>
         </div>
    );
  }
}

export default withStyles(styles)(Annotate);

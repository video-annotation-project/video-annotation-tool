import React, { Component } from 'react';
import Rnd from 'react-rnd';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import CurrentConcepts from './CurrentConcepts.jsx';
import VideoList from './VideoList.jsx';
import ErrorModal from './ErrorModal.jsx';
import List from '@material-ui/core/List';
import axios from 'axios';

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
    width: '460px',
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
   if(myVideo.paused)
   {
      myVideo.play();
   }
   else
   {
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

  getSelectedConcepts = async () => (
    axios.get(`/api/selected`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => (res.data))
      .catch(error => {
        this.setState({
          isloaded: true,
          error: error
        });
        return;
    })
  );

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
    await this.setState({conceptsSelected: temp});
    this.setState({
      isLoaded: true,
    });
  }

  handleVideoClick = (filename) => {
    this.setState({
       videoName: filename
     });

  };

  handleConceptClick = (concept) => {
    var myVideo = document.getElementById("video");
    var cTime = myVideo.currentTime;

    var dragBoxCord = document.getElementById("dragBox").getBoundingClientRect();
    var vidCord = myVideo.getBoundingClientRect();
    var leftBotX = Math.max((dragBoxCord.left-vidCord.left),0);
    var leftBotY = Math.min((dragBoxCord.bottom-vidCord.top),723);
    var rightTopX = Math.min((dragBoxCord.right-vidCord.left),1280);
    var rightTopY = Math.max((dragBoxCord.top-vidCord.top),0);
    //id | videoid | userid | conceptid | timeinvideo | topRightx | topRighty | botLeftx | botLefty | dateannotated
    fetch('/annotate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
      body: JSON.stringify({
        'conceptId': concept.name,
        'videoId': this.state.videoName,
        'timeinvideo': cTime,
        'leftBotX': leftBotX,
        'leftBotY': leftBotY,
        'rightTopX': rightTopX,
        'rightTopY': rightTopY,
      })
    }).then(res => res.json())
    .then(res => {
      if( res.message === "Annotated") {
        var videoInfo = JSON.parse(res.value);
        this.setState({
          errorMsg: "User: " + videoInfo.userid + " Annotated: " + concept.name + " in video " + videoInfo.videoid + " at time " + videoInfo.timeinvideo,
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
               <video id = "video"  width = "1280" height = "720" src={'api/videos/'+this.state.videoName} type='video/mp4' controls>
               Your browser does not support the video tag.
                 <source src='api/annotate' type='video/mp4' />
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

            <br />
            <span className = {classes.playScript}>Play at speed:</span>
            <p><input type = "text" id = "playSpeedId" className = {classes.playSpeed} placeholder = "100" />&ensp; %</p>
            <input type = "submit" value = "Enter" className = {classes.entered} onClick = {changeSpeed} />


         </div>
         <div className={classes.videoListContainer}>
           <span className = {classes.videoListText}>Select Video</span>
           <br />
           <VideoList handleVideoClick={this.handleVideoClick} />
         </div>
         <div className = {classes.conceptSectionContainer}>
            <span className = {classes.conceptsText}>Current Concepts</span>
            <br />
            {(this.state.isLoaded) ? (
              <CurrentConcepts  handleConceptClick={this.handleConceptClick} conceptsSelected={this.state.conceptsSelected} />
            ):(
              <List>Loading...</List>
            )}

         </div>
      </div>
    );
  }
}

export default withStyles(styles)(Annotate);

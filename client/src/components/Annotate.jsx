import React, { Component } from 'react';
import Rnd from 'react-rnd';
import Button from '@material-ui/core/Button';
import ReactDOM from 'react-dom';
import { withStyles } from '@material-ui/core/styles';
import CurrentConcepts from './CurrentConcepts.jsx';
import VideoList from './VideoList.jsx'

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
    postion: 'relative',
    top: '50px',
    border: '1px black solid',
    width: '1280px',
    height: '723px'
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
    width: '400px',
    height: '1000px',
    backgroundColor: 'white',
    borderLeft: '1px black solid',
    overflow: 'auto'
  },
  conceptsText: {
    fontWeight: 'bold',
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
});
/*
function changeSpeed() {

   try {
   var myVideo = document.getElementById("video");
   var speed = document.getElementById("playSpeed").value;
   if ((speed / 100) === 0)
   {
      myVideo.playbackRate = (1);
   }
   else
   {
      myVideo.playbackRate = (speed / 100);
   }
   }
   catch(err) {
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
*/

class Annotate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      videoName: 'DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4'
    };
  }

/*

  <Button variant = "contained" color = "primary" className = {classes.backwardButton} onClick = {rewind}>-5 sec</Button>
  <Button variant = "contained" color = "primary" className = {classes.playButton} onClick = {playPause}>Play/Pause</Button>
  <Button variant = "contained" color = "primary" className = {classes.forwardButton} onClick = {fastForward}>+5 sec</Button>

  <p><input type = "text" className = {classes.playSpeed} placeholder = "100" />&ensp; %</p>
  <input type = "submit" value = "Enter" className = {classes.entered} onClick = {changeSpeed} />
  */

  handleVideoClick = (filename) => {
    this.setState({
       videoName: filename
     });

  };

  render() {
    const { classes } = this.props;

    return (
      <div>
         <div className = {classes.clear}></div>
         <div className = {classes.videoSectionContainer}>
            <div className = {classes.videoContainer}>
            <div className = {classes.boxContainer}>
            {this.state.videoName}
               <video id = "video"  width = "1280" height = "723" src={'api/videos/'+this.state.videoName} type='video/mp4' controls>
               Your browser does not support the video tag.
               </video>
               <Rnd
                 default = {{
                    x: 30,
                    y: 30,
                    width: 60,
                    height: 60,
                 }}
                 minWidth = {25}
                 minHeight = {25}
                 maxWidth = {400}
                 maxHeight = {400}
                 bounds = "parent"
                 className = {classes.dragBox}
                 >
               </Rnd>
            </div>
            </div>
            <div className = {classes.clear}></div>

            <br />
            <span className = {classes.playScript}>Play at speed:</span>


         </div>
         <VideoList handleVideoClick={this.handleVideoClick} />
         <div className = {classes.conceptSectionContainer}>
            <span className = {classes.conceptsText}>Current Concepts</span>
            <br />
            <CurrentConcepts  />
         </div>
      </div>
    );
  }
}

export default withStyles(styles)(Annotate);

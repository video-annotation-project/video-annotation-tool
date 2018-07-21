import React, { Component } from 'react';
import Rnd from 'react-rnd';
import Button from '@material-ui/core/Button';
import ReactDOM from 'react-dom';
import { withStyles } from '@material-ui/core/styles';
import CurrentConcepts from './CurrentConcepts.jsx';

const styles = theme => ({
  clear: {
    clear: 'both'
  },
  videoSectionContainer: {
    width: '1280px',
    margin: '0 auto',
    float: 'left'
  },
  videoContainer: {
    float: 'left',
    marginleft: '15px'
  },
  boxContainer: {
    postion: 'relative',
    top: '50px',
    border: '1px black solid',
    width: '1280px',
    height: '723px'
  },
  playButton: {
    margintop: '60px',
    marginleft: '20px',
    fontsize: '15px',
    paddingtop: '10px',
    paddingbottom: '10px'
  }
});

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

class Annotate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      items: null
    };
  }

  render() {
    const { classes } = this.props;

    return (
      <div>
         <div className = {classes.clear}></div>
         <div className = {classes.videoSectionContainer}>
            <div className = {classes.videoContainer}>
            <div className = {classes.boxContainer}>
               <video id = "video" src = "fish2.mp4" width = "1280" height = "723" controls>
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
                 id = "dragBox"
                 >
               </Rnd>
            </div>
            </div>
            <div className = "clear"></div>
            <Button variant = "contained" color = "primary" id = "backwardButton1" onClick = {rewind}>-5 sec</Button>
            <Button variant = "contained" color = "primary" className = {classes.playButton} onClick = {playPause}>Play/Pause</Button>
            <Button variant = "contained" color = "primary" id = "forwardButton" onClick = {fastForward}>+5 sec</Button>
            <br />
            <span id = "playScript">Play at speed:</span>
            <p><input type = "text" id = "playSpeed" placeholder = "100" />&ensp; %</p>
            <input type = "submit" value = "Enter" id = "entered" onClick = {changeSpeed} />
         </div>
         <div id = "conceptSectionContainer">
            <span id = "conceptsText">Current Concepts</span>
            <br />
            <CurrentConcepts />
         </div>
      </div>
    );
  }
}

export default withStyles(styles)(Annotate);

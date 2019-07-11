import React, { Component } from "react";
import axios from "axios";
import io from "socket.io-client";

import AIvideoList from "./AIvideoList.jsx";
import DragBoxContainer from "../Utilities/DragBoxContainer.jsx";

import Slider from "@material-ui/core/Slider";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";


const styles = theme => ({
  videoContainer: {
    top: "50px",
    width: "1600px",
    height: "900px"
  },
  button: {
    marginTop: "10px",
    marginLeft: "20px",
    marginBottom: "10px"
  }
});

class Annotate extends Component {
  constructor(props) {
    super(props);

    // here we do a manual conditional proxy because React won't do it for us
    let socket;
    if (window.location.origin === "http://localhost:3000") {
      console.log("manually proxying socket");
      socket = io("http://localhost:3001");
    } else {
      socket = io();
    }
    // const socket = io({transports: ['polling, websocket']});

    socket.on("connect", () => {
      console.log("socket connected!");
    });
    socket.on("reconnect_attempt", attemptNumber => {
      console.log("reconnect attempt", attemptNumber);
    });
    socket.on("disconnect", reason => {
      console.log(reason);
    });
    socket.on("refresh videos", this.loadVideos);

    this.state = {
      aiVideos: [],
      currentVideo: null,
      isLoaded: false,
      videoPlaybackRate: 1.0,
      error: null,
      socket: socket,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    };
  }

  componentDidMount = async () => {
    // add event listener for closing or reloading window
    window.addEventListener("beforeunload", this.handleUnload);

    // add event listener for different key presses
    document.addEventListener("keydown", this.handleKeyDown);

    try {
      this.loadVideos(this.getCurrentVideo);
    } catch (error) {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      let errMsg =
        error.response.data.detail || error.response.data.message || "Error";
      console.log(errMsg);
      this.setState({
        isLoaded: true,
        error: errMsg
      });
    }
  };

  componentWillUnmount = () => {
    // this.updateCheckpoint(false, false);
    this.state.socket.disconnect();
    window.removeEventListener("beforeunload", this.handleUnload);
    document.removeEventListener("keydown", this.handleKeyDown);
  };

  handleUnload = ev => {
    var videoElement = document.getElementById("video");
    if (!videoElement.paused) {
      ev.preventDefault();
      ev.returnValue = "Are you sure you want to close?";
    }
  };

  handleKeyDown = e => {
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
  };

  skipVideoTime = time => {
    var videoElement = document.getElementById("video");
    var cTime = videoElement.currentTime;
    videoElement.currentTime = cTime + time;
  };

  playPause = () => {
    var videoElement = document.getElementById("video");
    console.log(videoElement);
    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  };

  toggleVideoControls = () => {
    var videoElement = document.getElementById("video");
    videoElement.controls = !videoElement.controls;
  };

  handleChangeSpeed = (event, value) => {
    this.setState(
      {
        videoPlaybackRate: Math.round(value * 10) / 10
      },
      () => {
        const videoElement = document.getElementById("video");
        videoElement.playbackRate = this.state.videoPlaybackRate;
      }
    );
  };

  loadVideos = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    return axios.get("/api/videos/aivideos", config).then(res => {
      this.setState(
        {
          aiVideos: res.data.rows
        }
      );
      this.getCurrentVideo();
    });
  };

  getCurrentVideo = () => {
    // if user does not have a video to be played, return default video 1
    let currentVideo = {
      id: this.state.aiVideos[0].id,
      filename: this.state.aiVideos[0].name,
      timeinvideo: 0
    };
    this.setState(
      {
        currentVideo: currentVideo,
        isLoaded: true
      },
      () => {
        var videoElement = document.getElementById("video");
        videoElement.currentTime = this.state.currentVideo.timeinvideo;
      }
    );
  };

  handleVideoClick = async (clickedVideo, videoListName) => {
    let currentVideo = {
        id: clickedVideo.id,
        filename: clickedVideo.name,
        timeinvideo: 0
      };
    this.setState(
      {
        currentVideo: currentVideo
      }
    );
  };

  render() {
    const { classes } = this.props;
    const { isLoaded, error, socket } = this.state;
    if (!isLoaded) {
      return <div>Loading...</div>;
    }
    if (error) {
      return <div>Error: {error}</div>;
    }
    return (
      <React.Fragment>
        <AIvideoList
          handleVideoClick={this.handleVideoClick}
          aiVideos={this.state.aiVideos}
          socket={socket}
          loadVideos={this.loadVideos}
        />
        <div>
          {this.state.currentVideo.id + " " + this.state.currentVideo.filename}
          <DragBoxContainer className={classes.videoContainer}>
            <video
              className={classes.videoContainer}
            //   onPause={() => this.updateCheckpoint(false, true)}
              id="video"
              width="1600"
              height="900"
              src={
                "https://cdn.deepseaannotations.com/ai_videos/" +
                this.state.currentVideo.filename
              }
              type="video/mp4"
              crossOrigin="use-credentials"
            >
              Your browser does not support the video tag.
            </video>
          </DragBoxContainer>
          <div
            style={{
              marginTop: "10px",
              marginLeft: "20px",
              marginBottom: "10px",
              float: "left"
            }}
          >
            <Slider
              style={{
                width: 200,
                marginTop: 10
              }}
              value={this.state.videoPlaybackRate}
              min={0}
              max={4}
              step={0.1}
              onChange={this.handleChangeSpeed}
            />
            <Typography
              style={{
                marginTop: 20
              }}
            >
              Play Rate: {this.state.videoPlaybackRate}
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
          >
            Toggle Controls
          </Button>
        </div>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(Annotate);

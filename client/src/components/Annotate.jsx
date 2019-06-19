import React, { Component } from "react";
import axios from "axios";
import io from "socket.io-client";

import ConceptsSelected from "./ConceptsSelected.jsx";
import DialogModal from "./DialogModal.jsx";
import VideoList from "./VideoList.jsx";
import DragBoxContainer from "./DragBoxContainer.jsx";

import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import Slider from "@material-ui/lab/Slider";

const styles = theme => ({
  videoContainer: {
    postion: "absolute",
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
      socket: socket,
      dragBoxWidth: 30,
      dragBoxHeight: 30,
      dragBoxX: 30,
      dragBoxY: 30,
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
    this.updateCheckpoint(false, false);
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

  loadVideos = callback => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    return axios.get("/api/videos", config).then(res => {
      this.setState(
        {
          startedVideos: res.data[0].rows,
          unwatchedVideos: res.data[1].rows,
          watchedVideos: res.data[2].rows,
          inProgressVideos: res.data[3].rows
        },
        callback
      );
    });
  };

  getCurrentVideo = () => {
    // if user does not have a video to be played, return default video 1
    let currentVideo = {
      id: 1,
      filename: "DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4",
      timeinvideo: 0,
      finished: true
    };
    if (this.state.startedVideos.length > 0) {
      // currentVideo is the first item in startedVideos
      currentVideo = this.state.startedVideos[0];
    } else if (this.state.unwatchedVideos.length > 0) {
      // currentVideo is the first item in unwatchedVideos
      currentVideo = this.state.unwatchedVideos[0];
    }
    this.setState(
      {
        currentVideo: currentVideo,
        isLoaded: true
      },
      () => {
        var videoElement = document.getElementById("video");
        videoElement.currentTime = this.state.currentVideo.timeinvideo;
        this.updateCheckpoint(false, true);
      }
    );
  };

  updateCheckpoint = (doneClicked, reloadVideos) => {
    /*
      when the checkpoint for a video is updated, there are three places that
      need to reflect this: this.state.currentVideo, the videos list, and the 
      checkpoints table in the SQL database. Upon successful resolution of the 
      SQL database update, we reload the videos list by calling this.loadVideos,
      and if the done button was clicked, we reload this.state.currentVideo.
    */
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    let videoElement = document.getElementById("video");
    const body = {
      timeinvideo: videoElement.currentTime,
      finished: doneClicked || this.state.currentVideo.finished
    };
    // update SQL database
    return axios
      .put("/api/checkpoints/" + this.state.currentVideo.id, body, config)
      .then(res => {
        if (reloadVideos) {
          return this.loadVideos(doneClicked ? this.getCurrentVideo : null);
        }
      })
      .catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
        if (!error.response) {
          return;
        }
        let errMsg =
          error.response.data.detail || error.response.data.message || "Error";
        console.log(errMsg);
        this.setState({
          error: errMsg
        });
      });
  };

  handleDoneClick = async () => {
    // update video checkpoint to watched
    await this.updateCheckpoint(true, true);
    this.state.socket.emit("refresh videos");
  };

  handleVideoClick = async (clickedVideo, videoListName) => {
    await this.updateCheckpoint(false, true);
    this.setState(
      {
        currentVideo: clickedVideo
      },
      async () => {
        var videoElement = document.getElementById("video");
        videoElement.currentTime = this.state.currentVideo.timeinvideo;
        await this.updateCheckpoint(false, true);
        this.state.socket.emit("refresh videos");
      }
    );
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

    var dragBoxCord = document
      .getElementById("dragBox")
      .getBoundingClientRect();
    var vidCord = videoElement.getBoundingClientRect();
    var video_x1 = vidCord.left;
    var video_y1 = vidCord.top;

    //Make video image
    var canvas = document.createElement("canvas");
    canvas.height = vidCord.height;
    canvas.width = vidCord.width;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    var videoImage = new Image();
    videoImage.setAttribute("crossOrigin", "use-credentials");
    videoImage.src = canvas.toDataURL(1.0);

    var box_x1 = dragBoxCord.left;
    var box_y1 = dragBoxCord.top;
    var height = dragBoxCord.height;
    var width = dragBoxCord.width;

    // Bouding box coordinates
    var x1 = Math.max(box_x1 - video_x1, 0);
    var y1 = Math.max(box_y1 - video_y1, 0);
    var x2 = Math.min(x1 + width, 1599);
    var y2 = Math.min(y1 + height, 899);

    //draw video with and without bounding box to canvas and save as img
    var date = Date.now().toString();

    const body = {
      conceptId: this.state.clickedConcept.id,
      videoId: this.state.currentVideo.id,
      timeinvideo: cTime,
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      videoWidth: 1600,
      videoHeight: 900,
      image: date,
      imagewithbox: date + "_box",
      comment: comment,
      unsure: unsure
    };
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .post("/api/annotations", body, config)
      .then(async res => {
        console.log(res.data.message);
        this.handleDialogClose();
        this.createAndUploadImages(
          videoImage,
          ctx,
          canvas,
          dragBoxCord,
          date,
          x1,
          y1
        );
      })
      .catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
        if (!error.response) {
          return;
        }
        let errMsg =
          error.response.data.detail || error.response.data.message || "Error";
        console.log(errMsg);
        this.setState({
          error: errMsg
        });
      });
  };

  createAndUploadImages = (
    videoImage,
    ctx,
    canvas,
    dragBoxCord,
    date,
    x1,
    y1
  ) => {
    this.uploadImage(videoImage, date, false);
    ctx.lineWidth = "2";
    ctx.strokeStyle = "coral";
    ctx.rect(x1, y1, dragBoxCord.width, dragBoxCord.height);
    ctx.stroke();
    videoImage.src = canvas.toDataURL(1.0);
    this.uploadImage(videoImage, date, true);
  };

  uploadImage = (img, date, box) => {
    let buf = new Buffer(
      img.src.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      buf: buf,
      date: date,
      box: box
    };
    return axios.post("/api/annotationImages", body, config).catch(error => {
      console.log(error);
    });
  };

  handleConceptClick = concept => {
    var videoElement = document.getElementById("video");
    this.setState({
      dialogMsg:
        concept.name +
        " in video " +
        this.state.currentVideo.filename +
        " at time " +
        Math.floor(videoElement.currentTime / 60) +
        " minutes " +
        (videoElement.currentTime % 60) +
        " seconds",
      dialogOpen: true,
      clickedConcept: concept,
      closeHandler: this.handleDialogClose
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
    const { isLoaded, error, socket } = this.state;
    if (!isLoaded) {
      return <div>Loading...</div>;
    }
    if (error) {
      return <div>Error: {error}</div>;
    }
    return (
      <React.Fragment>
        <ConceptsSelected handleConceptClick={this.handleConceptClick} />
        <VideoList
          handleVideoClick={this.handleVideoClick}
          startedVideos={this.state.startedVideos}
          unwatchedVideos={this.state.unwatchedVideos}
          watchedVideos={this.state.watchedVideos}
          inProgressVideos={this.state.inProgressVideos}
          socket={socket}
          loadVideos={this.loadVideos}
        />
        <div>
          {this.state.currentVideo.id + " " + this.state.currentVideo.filename}
          <DragBoxContainer 
            className={classes.videoContainer} 
            dragBox={classes.dragBox}
            drawDragBox={true}

            size={{
              width: this.state.dragBoxWidth,
              height: this.state.dragBoxHeight
            }}
            
            position={{ x: this.state.dragBoxX, y: this.state.dragBoxY }}
            onDragStop={(e, d) => {
              this.setState({ dragBoxX: d.x, dragBoxY: d.y });
            }}

            onResize={(e, direction, ref, delta, position) => {
              this.setState({
                dragBoxWidth: ref.style.width,
                dragBoxHeight: ref.style.height,
                ...position
              });
            }}
          >
            <video
              onPause={() => this.updateCheckpoint(false, true)}
              id="video"
              width="1600"
              height="900"
              src={'https://cdn.deepseaannotations.com/videos/' +
                this.state.currentVideo.filename}
              type='video/mp4'
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
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={() => this.handleDoneClick()}
          >
            Done
          </Button>
        </div>
        {this.state.dialogOpen && (
          <DialogModal
            title={"Confirm Annotation"}
            message={this.state.dialogMsg}
            placeholder={"Comments"}
            inputHandler={this.postAnnotation}
            open={
              true /* The DialogModal 'openness' is controlled through
              boolean logic rather than by passing in a variable as an
              attribute. This is to force DialogModal to unmount when it closes
              so that its state is reset. This also prevents the accidental
              double submission bug, by implicitly reducing the transition time
              of DialogModal to zero. */
            }
            handleClose={this.state.closeHandler}
          />
        )}
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(Annotate);

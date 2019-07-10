import React, { Component } from "react";
import axios from "axios";
import io from "socket.io-client";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import Slider from "@material-ui/core/Slider";
import VideoList from "../Utilities/VideoList";
import Swal from "sweetalert2";
import CollectionList from "./CollectionVideoList.jsx";
import Annotate from "../Annotate.jsx"

const styles = theme => ({
  videoContainer: {
    top: "50px",
    width: "1600px",
    height: "900px"
  },
  dragBox: {
    margin: "0px",
    backgroundColor: "transparent",
    border: "2px coral solid",
    borderStyle: "ridge"
  },
  button: {
    marginTop: "10px",
    marginLeft: "20px",
    marginBottom: "10px"
  },
  drawer: {
    width: "550px",
    overflow: "auto"
  },
  toggleButton: {
    float: "right",
    marginTop: "5px"
  }
});

class videoCollection extends Component {
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
    // add event listener for closing or reloading window
    window.addEventListener("beforeunload", this.handleUnload);

    // add event listener for different key presses
    document.addEventListener("keydown", this.handleKeyDown);
    this.handleUnload = Annotate.handleUnload;
    this.skipVideoTime = Annotate.skipVideoTime;
    this.playPause = Annotate.playPause;
    this.toggleVideoControls = Annotate.toggleVideoControls;

    try {
      this.loadVideos(this.getCurrentVideo);
      this.loadCollections();
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

  handleKeyDown = e => {
    if (e.target !== document.body) {
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      Annotate.playPause();
    }
    if (e.code === "ArrowRight") {
      e.preventDefault();
      Annotate.skipVideoTime(1);
    }
    if (e.code === "ArrowLeft") {
      e.preventDefault();
      Annotate.skipVideoTime(-1);
    }
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

  loadCollections = callback => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    return axios.get("/api/videoCollections", config).then(res => {
      this.setState(
        {
          collections: res.data
        },
        callback
      );
    });
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

  deleteVideoCollection = async id => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async result => {
      if (result.value) {
        try {
          let response = await axios.delete(
            "/api/videoCollection/" + id,
            config
          );
          if (response.status === 200) {
            Swal.fire("Deleted!", "Collection has been deleted.", "success");
            this.loadCollections();
          }
        } catch (error) {
          Swal.fire(error, "", "error");
        }
      }
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

  createCollection = () => {
    Swal.mixin({
      confirmButtonText: "Next",
      showCancelButton: true,
      progressSteps: ["1", "2"]
    })
      .queue([
        {
          title: "Collection Name",
          input: "text"
        },
        {
          title: "Description",
          input: "textarea"
        }
      ])
      .then(async result => {
        if (result.value) {
          const body = {
            name: result.value[0],
            description: result.value[1]
          };
          const config = {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + localStorage.getItem("token")
            }
          };
          try {
            await axios.post("/api/videoCollection", body, config);
            Swal.fire({
              title: "Collection Created!",
              confirmButtonText: "Lovely!"
            });
          } catch (error) {
            Swal.fire("", error, error);
          }
        }
      });
  };

  insertVideosToCollection = (id, list) => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      videos: list
    };
    try {
      axios
        .post("/api/videoCollection/" + id, body, config)
        .then(res => {
          this.toggleDrawer();
          Swal.fire({
            title: "Inserted!",
            confirmButtonText: "Lovely!"
          });
        })
        .catch(error => {
          Swal.fire("Could not insert", "", "error");
        });
    } catch (error) {
      Swal.fire("", error, error);
    }
  };

  toggleDrawer = () => {
    this.setState({
      drawerOpen: !this.state.drawerOpen
    });
  };

  toggle = list => {
    this.setState({
      [list]: !this.state[list]
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
        <CollectionList
          collType="video"
          data={this.state.collections}
          createCollection={this.createCollection}
          loadCollections={this.loadCollections}
          deleteCollection={this.deleteVideoCollection}
          insertToCollection={this.insertVideosToCollection}
          openedVideo={this.state.currentVideo}
        />
        <VideoList
          handleVideoClick={this.handleVideoClick}
          startedVideos={this.state.startedVideos}
          unwatchedVideos={this.state.unwatchedVideos}
          watchedVideos={this.state.watchedVideos}
          inProgressVideos={this.state.inProgressVideos}
          socket={socket}
          loadVideos={this.loadVideos}
          /* these are props for collection component only */
          collection={true}
          insertToCollection={this.insertVideosToCollection}
          data={this.state.collections}
          loadCollections={this.loadCollections}
        />
        <div>
          {this.state.currentVideo.id + " " + this.state.currentVideo.filename}
          <div className={classes.videoContainer}>
            <video
              onPause={() => this.updateCheckpoint(false, true)}
              id="video"
              width="1600"
              height="900"
              src={
                "https://cdn.deepseaannotations.com/videos/" +
                this.state.currentVideo.filename
              }
              type="video/mp4"
              crossOrigin="use-credentials"
            >
              Your browser does not support the video tag.
            </video>
          </div>
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
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(videoCollection);

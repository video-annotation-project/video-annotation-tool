import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { Typography } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import OndemandVideo from "@material-ui/icons/OndemandVideo";
import Photo from "@material-ui/icons/Photo";
import IconButton from "@material-ui/core/IconButton";
import blue from "@material-ui/core/colors/blue";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import Description from "@material-ui/icons/Description";
import Avatar from "@material-ui/core/Avatar";
import Grid from "@material-ui/core/Grid";
import Swal from "sweetalert2";

import DialogModal from "../Utilities/DialogModal";
import ConceptsSelected from "../Utilities/ConceptsSelected";
import DragBoxContainer from "../Utilities/DragBoxContainer.jsx";
import VideoMetadata from "../Utilities/VideoMetadata.jsx";

import Hotkeys from 'react-hot-keys';

const styles = theme => ({
  button: {
    margin: theme.spacing()
  },
  img: {
    top: "50px",
  },
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gridGap: theme.spacing(3)
  },
  paper: {
    padding: theme.spacing()
  },
  dragBox: {
    margin: "0px",
    backgroundColor: "transparent",
    border: "2px coral solid",
    borderStyle: "ridge"
  },
  avatar: {
    backgroundColor: blue[100],
    color: blue[600]
  },
  icons: {
    float: "right"
  },
  buttonsContainer1: {
    marginTop: "10px",
    float: "left",
    margin: "0 auto"
  },
  buttonsContainer2: {
    float: "left",
    margin: "0 auto"
  }
});

const theme = createMuiTheme({
  palette: {
    secondary: {
      main: "#565656"
    }
  }
});

class VerifyAnnotations extends Component {
  constructor(props) {
    super(props);
    this.state = {
      disableVerify: false,
      currentIndex: this.props.index,
      concept: null,
      comment: this.props.annotation.comment,
      unsure: this.props.annotation.unsure,
      error: null,
      conceptDialogMsg: null,
      conceptDialogOpen: false,
      clickedConcept: null,
      x: this.props.annotation.x1,
      y: this.props.annotation.y1,
      width: this.props.annotation.x2 - this.props.annotation.x1,
      height: this.props.annotation.y2 - this.props.annotation.y1,
      videoDialogOpen: false /* Needed for dialog component */,
      drawDragBox: true,
      trackingStatus: null
    };
  }

  displayLoading = () => {
    if (!this.props.tracking && !this.state.videoDialogOpen) {
      Swal.fire({
        title: "Loading...",
        showConfirmButton: false,
        onBeforeOpen: () => {
          Swal.showLoading();
        },
      });
    }
  };

  componentDidMount = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.displayLoading();
  };

  handleKeyDown = (keyName, e, handle) => {
    e.preventDefault();
    if (e.target !== document.body) {
      return;
    } else if (keyName === "r") {
      // reset shortcut
      this.resetState();
    } else if (keyName === "d") {
      // delete shortcut
      this.handleDelete();
    } else if (keyName === "i") {
      // ignore shortcut
      this.nextAnnotation();
    } else if (keyName === "v") {
      // Verify shortcut
      this.handleVerifyClick();
    }
  };

  verifyAnnotation = async () => {
    const body = {
      op: "verifyAnnotation",
      id: this.props.annotation.id,
      conceptId: !this.state.concept ? null : this.state.concept.id,
      comment: this.state.comment,
      unsure: this.state.unsure,
      oldConceptId: !this.state.concept ? null : this.props.annotation.conceptid
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };

    return axios
      .patch(`/api/annotations/`, body, config)
      .then(res => {
        this.nextAnnotation();
        return res.data;
      })
      .catch(error => {
        Swal.fire(error, "", "error");
      });
  };

  resetState = () => {
    this.setState({
      drawDragBox: true,
      disableVerify: false,
      concept: null,
      comment: this.props.annotation.comment,
      unsure: this.props.annotation.unsure,
      x: this.props.annotation.x1,
      y: this.props.annotation.y1,
      width: this.props.annotation.x2 - this.props.annotation.x1,
      height: this.props.annotation.y2 - this.props.annotation.y1
    });
  };

  toggleDragBox = () => {
    this.setState({
      drawDragBox: false
    });
  };

  nextAnnotation = () => {
    this.setState({
      trackingStatus: null
    })
    if (this.props.size === this.props.index + 1) {
      this.setState({
        end: true
      });
      return;
    }
    this.displayLoading();
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.props.handleNext(this.resetState);
  };

  handleConceptDialogClose = () => {
    this.setState({
      conceptDialogOpen: false,
      conceptDialogMsg: null
    });
  };

  handleConceptClick = concept => {
    this.setState({
      conceptDialogMsg:
        "Switch " + this.props.annotation.name + " to " + concept.name + "?",
      conceptDialogOpen: true,
      clickedConcept:
        this.props.annotation.conceptid === concept.id ? null : concept
    });
  };

  changeConcept = (comment, unsure) => {
    this.setState({
      concept: this.state.clickedConcept,
      comment: comment,
      unsure: unsure
    });
  };

  handleDelete = () => {
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      data: {
        id: this.props.annotation.id
      }
    };
    axios
      .delete("/api/annotations", config)
      .then(res => {
        return res.data;
      })
      .catch(error => {
        Swal.fire(error, "", "error");
      });
    this.nextAnnotation();
  };

  postBoxImage = async dragBox => {
    const dragBoxCord = dragBox.getBoundingClientRect();
    const imageElement = document.getElementById("image");
    const imageCord = imageElement.getBoundingClientRect("dragBox");
    const x1 = this.state.x;
    const y1 = this.state.y;
    const x2 = this.state.x + parseInt(this.state.width, 0);
    const y2 = this.state.y + parseInt(this.state.height, 0);

    const annotation = this.props.annotation;

    try {
      if (
        Math.abs(
          annotation.x1 -
            x1 +
            (annotation.y1 - y1) +
            (annotation.x2 - x2) +
            (annotation.y2 - y2)
        ) > 0.1 &&
        annotation.image
      ) {
        this.createAndUploadImages(
          imageCord,
          dragBoxCord,
          imageElement,
          x1,
          y1
        );
        this.updateBox(x1, y1, x2, y2, imageCord, dragBoxCord, imageElement);
      }

      this.verifyAnnotation();
    } catch {
      console.log("Unable to Verify");
      this.nextAnnotation();
    }
  };

  createAndUploadImages = (imageCord, dragBoxCord, imageElement, x1, y1) => {
    let canvas = document.createElement("canvas");
    canvas.height = imageCord.height;
    canvas.width = imageCord.width;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    let img = new Image();
    img.setAttribute("crossOrigin", "use-credentials");
    ctx.lineWidth = "2";
    ctx.strokeStyle = "coral";
    ctx.rect(x1, y1, dragBoxCord.width, dragBoxCord.height);
    ctx.stroke();
    img.src = canvas.toDataURL(1.0);
    this.uploadImage(img);
  };

  uploadImage = img => {
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
      name: this.props.annotation.imagewithbox
    };
    try {
      axios.post("/api/annotations/images", body, config);
    } catch {
      Swal.fire("ERR: uploading image", "", "error");
    }
  };

  updateBox = (x1, y1, x2, y2, imageCord, dragBoxCord, imageElement) => {
    const body = {
      op: "updateBoundingBox",
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      oldx1: this.props.annotation.x1,
      oldy1: this.props.annotation.y1,
      oldx2: this.props.annotation.x2,
      oldy2: this.props.annotation.y2,
      id: this.props.annotation.id
    };
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios.patch(`/api/annotations/`, body, config).catch(error => {
      Swal.fire(error, "", "error");
    });
  };

  handleVerifyClick = () => {
    let dragBox = document.getElementById("dragBox");

    if (dragBox === null) {
      Swal.fire({
        title: "Error",
        text: "No bounding box exists.",
        type: "error",
        confirmButtonText: "Okay"
      });
      return;
    }

    this.postBoxImage(dragBox);
  };

  videoDialogToggle = () => {
    this.setState({
      videoDialogOpen: !this.state.videoDialogOpen
    });
  };

  openVideoMetadata = (event, video) => {
    event.stopPropagation();
    this.setState({
      openedVideo: video
    });
  };

  closeVideoMetadata = () => {
    this.setState({
      openedVideo: null
    });
  };

  handleErrImage = () => {
    Swal.close();
    this.setState({
      disableVerify: true
    });
  };

  getStatus = flag => {
    switch (flag) {
      case false:
        return "Bad Tracking";
      case true:
        return "Good Tracking";
      default:
        return "Tracking Not Verified";
    }
  };

  markTracking = async flag => {
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      flag: flag
    };
    try {
      await axios.patch(
        `/api/annotations/tracking/${this.props.annotation.id}`,
        body,
        config
      );
      this.setState({
        trackingStatus: flag
      })
      Swal.fire("Successfully Marked", "", "success");
      if (this.props.tracking) {
        this.nextAnnotation();
      }
    } catch (error) {
      Swal.fire("Error marking video as bad", "", "error");
    }
  };

  render() {
    const { classes } = this.props;
    let { unsure } = this.state;
    let annotation = this.props.annotation;

    if (this.state.x === null) {
      return <div>Loading...</div>;
    }

    return (
      <React.Fragment>
        {this.state.conceptDialogOpen && (
          <DialogModal
            title={"Confirm Annotation Edit"}
            message={this.state.conceptDialogMsg}
            placeholder={"Comments"}
            comment={this.state.comment}
            inputHandler={this.changeConcept}
            open={true}
            handleClose={this.handleConceptDialogClose}
            unsure={unsure}
          />
        )}
        {!this.state.end ? (
          <React.Fragment>
            {this.props.tracking || this.state.videoDialogOpen ? (
              <div>
                <DragBoxContainer>
                  <video
                    id="video"
                    width="1300"
                    height="730"
                    src={
                      "https://cdn.deepseaannotations.com/videos/" +
                      annotation.id +
                      "_tracking.mp4"
                    }
                    type="video/mp4"
                    controls
                  >
                    Your browser does not support the video tag.
                  </video>
                </DragBoxContainer>
                <div
                  className={classes.buttonsContainer1}
                  style={{ width: annotation.videowidth / 2 }}
                >
                  <Button
                    className={classes.button}
                    variant="contained"
                    color="primary"
                    onClick={() => this.markTracking(true)}
                  >
                    Mark as Good Tracking Video
                  </Button>
                  <Button
                    className={classes.button}
                    variant="contained"
                    color="secondary"
                    onClick={() => this.markTracking(false)}
                  >
                    Mark as Bad Tracking Video
                  </Button>
                  <Button
                    className={classes.button}
                    variant="contained"
                    onClick={this.nextAnnotation}
                  >
                    {this.props.tracking ? "Ignore" : "Next"}
                  </Button>
                  {this.state.videoDialogOpen ? 
                    <IconButton
                    onClick={this.videoDialogToggle}
                    aria-label="Photo"
                  >
                    <Photo />
                  </IconButton>
                  : ""
                  }
                </div>
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <div>
                <Typography variant="subtitle1" className={classes.button}>
                  <b>Status: </b>{" "}
                  {!this.state.trackingStatus ?
                    this.getStatus(this.props.annotation.tracking_flag):
                    this.getStatus(this.state.trackingStatus)
                  }
                </Typography>
                <Typography className={classes.paper}>
                  {this.props.index + 1} of {this.props.size}
                </Typography>
                </div>
              </div>
            ) : (
              <div>
                <Hotkeys
                  keyName="r, d, i, v"
                  onKeyDown={this.handleKeyDown.bind(this)}
                / >
                <div>
                  <DragBoxContainer
                    className={classes.img}
                    dragBox={classes.dragBox}
                    drawDragBox={this.state.drawDragBox}
                    toggleDragBox={this.toggleDragBox}
                    size={{
                      width: this.state.width,
                      height: this.state.height
                    }}
                    position={{ x: this.state.x, y: this.state.y }}
                    onDragStop={(e, d) => {
                      this.setState({ x: d.x, y: d.y });
                    }}
                    onResize={(e, direction, ref, delta, position) => {
                      this.setState({
                        width: ref.style.width,
                        height: ref.style.height,
                        ...position
                      });
                    }}
                  >
                    <img
                      id="image"
                      onLoad={Swal.close}
                      onError={this.handleErrImage}
                      className={classes.img}
                      src={
                        "https://cdn.deepseaannotations.com/test/" +
                        annotation.image
                      }
                      alt="error"
                      crossOrigin="use-credentials"
                      style={{
                        width: annotation.videowidth,
                        height: annotation.videoheight
                      }}
                    />
                  </DragBoxContainer>
                </div>
                <Typography className={classes.paper}>
                  {this.props.index + 1} of {this.props.size}
                </Typography>
                <div
                  className={classes.buttonsContainer1}
                  style={{ width: annotation.videowidth / 2 }}
                >
                  <MuiThemeProvider theme={theme}>
                    <Button
                      className={classes.button}
                      variant="contained"
                      color="secondary"
                      onClick={this.handleDelete}
                    >
                      Delete
                    </Button>
                  </MuiThemeProvider>
                  <Button
                    className={classes.button}
                    variant="contained"
                    onClick={this.resetState}
                  >
                    Reset Box
                  </Button>
                  <Button
                    className={classes.button}
                    variant="contained"
                    onClick={this.nextAnnotation}
                  >
                    Ignore
                  </Button>
                  {this.state.disableVerify !== true ? (
                    <Button
                      className={classes.button}
                      variant="contained"
                      color="primary"
                      onClick={this.handleVerifyClick}
                    >
                      Verify
                    </Button>
                  ) : (
                    <Button
                      className={classes.button}
                      variant="contained"
                      color="primary"
                      onClick={this.handleVerifyClick}
                      disabled
                    >
                      Verify
                    </Button>
                  )}
                  {!this.state.videoDialogOpen ? (
                    <IconButton
                      onClick={this.videoDialogToggle}
                      aria-label="OnDemandVideo"
                    >
                      <OndemandVideo />
                    </IconButton>
                  ) : (
                    <IconButton
                      onClick={this.videoDialogToggle}
                      aria-label="Photo"
                    >
                      <Photo />
                    </IconButton>
                  )}
                </div>
                <div
                  className={classes.buttonsContainer2}
                  style={{ width: annotation.videowidth / 2 }}
                >
                  <Grid container direction="row" alignItems="center">
                    <Grid item>
                      <Avatar
                        src={`/api/concepts/images/${
                          !this.state.concept
                            ? annotation.conceptid
                            : this.state.concept.id
                        }`}
                      />
                    </Grid>
                    <Grid item>
                      <h3>
                        {!this.state.concept
                          ? annotation.name
                          : this.state.concept.name}
                      </h3>
                    </Grid>
                    <Grid item xs>
                      <ConceptsSelected
                        handleConceptClick={this.handleConceptClick}
                      />
                      {/* <VideoDialogWrapped
                        annotation={annotation}
                        open={this.state.videoDialogOpen}
                        onClose={this.videoDialogToggle}
                      /> */}
                    </Grid>
                  </Grid>
                </div>
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
              </div>
            )}
            <div>
              <Typography className={classes.paper} variant="h5">
                Annotation #{annotation.id}
              </Typography>
              <Typography className={classes.paper} variant="body2">
                Video: {annotation.videoid + " " + annotation.filename}
                <IconButton
                  onClick={event =>
                    this.openVideoMetadata(event, { id: annotation.videoid })
                  }
                >
                  <Description style={{ fontSize: 20 }} />
                </IconButton>
              </Typography>
              <Typography className={classes.paper} variant="body2">
                Annotated by: {annotation.username}
              </Typography>
              <Typography className={classes.paper} variant="body2">
                Time: {Math.floor(annotation.timeinvideo / 60)} minutes{" "}
                {Math.floor(annotation.timeinvideo % 60)} seconds
              </Typography>
              <Typography className={classes.paper} variant="body2">
                Concept:{" "}
                {!this.state.concept
                  ? annotation.name
                  : this.state.concept.name}
              </Typography>
              {this.state.comment !== "" ? (
                <Typography className={classes.paper} variant="body2">
                  Comment: {this.state.comment}
                </Typography>
              ) : (
                ""
              )}
              {this.state.unsure !== null ? (
                <Typography className={classes.paper} variant="body2">
                  Unsure:{" "}
                  {this.state.unsure
                    .toString()
                    .charAt(0)
                    .toUpperCase() + this.state.unsure.toString().slice(1)}
                </Typography>
              ) : (
                ""
              )}
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Typography className={classes.paper}>Finished</Typography>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              onClick={this.props.toggleSelection}
            >
              Filter Annotations
            </Button>
          </React.Fragment>
        )}
        {this.state.openedVideo && (
          <VideoMetadata
            open={
              true /* The VideoMetadata 'openness' is controlled through
              boolean logic rather than by passing in a letiable as an
              attribute. This is to force VideoMetadata to unmount when it 
              closes so that its state is reset. This also prevents the 
              accidental double submission bug, by implicitly reducing 
              the transition time of VideoMetadata to zero. */
            }
            handleClose={this.closeVideoMetadata}
            openedVideo={this.state.openedVideo}
            socket={this.props.socket}
            loadVideos={this.props.loadVideos}
            model={false}
          />
        )}
      </React.Fragment>
    );
  }
}

VerifyAnnotations.propTypes = {
  classes: PropTypes.object
};

export default withStyles(styles)(VerifyAnnotations);

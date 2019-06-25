import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { Typography } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import DialogModal from "./DialogModal";
import OndemandVideo from "@material-ui/icons/OndemandVideo";
import IconButton from "@material-ui/core/IconButton";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import blue from "@material-ui/core/colors/blue";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import ConceptsSelected from "./ConceptsSelected";
import DragBoxContainer from "./DragBoxContainer.jsx";

import VideoMetadata from "./VideoMetadata.jsx";
import Description from "@material-ui/icons/Description";
import Avatar from "@material-ui/core/Avatar";
import Grid from "@material-ui/core/Grid";
import Swal from "sweetalert2";

const styles = theme => ({
  button: {
    margin: theme.spacing.unit
  },
  item: {
    display: "inline",
    paddingTop: 0,
    width: "1300px",
    height: "730px",
    paddingLeft: 0
  },
  img: {
    top: "50px"
  },
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gridGap: `${theme.spacing.unit * 3}px`
  },
  paper: {
    padding: theme.spacing.unit
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
      currentIndex: this.props.index,
      concept: null,
      comment: null,
      unsure: null,
      error: null,
      conceptDialogMsg: null,
      conceptDialogOpen: false,
      clickedConcept: null,
      x: this.props.annotation.x1,
      y: this.props.annotation.y1,
      width: this.props.annotation.x2 - this.props.annotation.x1,
      height: this.props.annotation.y2 - this.props.annotation.y1,
      videoDialogOpen: false /* needed for dialog component */
    };
  }

  displayLoading = () => {
    Swal.fire({
      title: "Loading...",
      showConfirmButton: false,
      onBeforeOpen: () => {
        Swal.showLoading();
      },
      onClose: () => {
        /* we removed the eventListener before displaying the loading modal to prevent double submissions 
          Once the loading modal closes, we add it back. */
        document.addEventListener("keydown", this.handleKeyDown);
      }
    });
  };

  componentDidMount = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.displayLoading();
  };

  componentWillUnmount = () => {
    document.removeEventListener("keydown", this.handleKeyDown);
  };

  // keyboard shortcuts for verifying annotations
  handleKeyDown = e => {
    // if the user is actually trying to type something, then don't interpret it as a keyboard shorcut
    if (e.target !== document.body) {
      return;
    }
    if (e.code === "KeyR") {
      // reset shortcut
      this.resetState();
      return;
    }
    // we remove the event listener to prevent double submissions
    // we will add it back once the next annotation has loaded
    document.removeEventListener("keydown", this.handleKeyDown);
    if (e.code === "KeyD") {
      // delete shortcut
      this.handleDelete();
    } else if (e.code === "KeyI") {
      // ignore shortcut
      this.nextAnnotation();
    } else if (e.code === "KeyV") {
      // verify shortcut
      this.handleVerifyClick();
    }
  };

  verifyAnnotation = async () => {
    const body = {
      id: this.props.annotation.id,
      conceptid: !this.state.concept ? null : this.state.concept.id,
      comment: this.state.comment,
      unsure: this.state.unsure
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };

    return axios
      .patch(`/api/annotationsVerify/`, body, config)
      .then(res => {
        this.nextAnnotation();
        return res.data;
      })
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  resetState = () => {
    this.setState({
      concept: null,
      comment: null,
      unsure: null,
      x: this.props.annotation.x1,
      y: this.props.annotation.y1,
      width: this.props.annotation.x2 - this.props.annotation.x1,
      height: this.props.annotation.y2 - this.props.annotation.y1
    });
  };

  nextAnnotation = () => {
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
        "Switch " + this.props.annotation + " to " + concept.name + "?",
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
        this.setState({
          error: error
        });
      });
    this.nextAnnotation();
  };

  postBoxImage = async (dragBox) => {


    var dragBoxCord = dragBox.getBoundingClientRect();

    var imageElement = document.getElementById("image");
    var imageCord = imageElement.getBoundingClientRect("dragBox");
    var x1_image = imageCord.left;
    var y1_image = imageCord.top;
    var x1_box = dragBoxCord.left;
    var y1_box = dragBoxCord.top;
    var height = dragBoxCord.height;
    var width = dragBoxCord.width;

    var x1 = Math.max(x1_box - x1_image, 0);
    var y1 = Math.max(y1_box - y1_image, 0);
    var x2 = Math.min(x1 + width, this.props.annotation.videowidth - 1);
    var y2 = Math.min(y1 + height, this.props.annotation.videoheight - 1);

    var annotation = this.props.annotation;

    if (Math.abs(annotation.x1 + annotation.x2 + annotation.y1 + annotation.y2 
      - x1 - x2 - y1 - y2) > 0.1) {
      // Only update box if it is changed by user
      await this.updateBox(x1, y1, x2, y2, imageCord, dragBoxCord, imageElement);
    }
  };

  createAndUploadImages = async (
    imageCord,
    dragBoxCord,
    imageElement,
    x1,
    y1
  ) => {
    var canvas = document.createElement("canvas");
    canvas.height = imageCord.height;
    canvas.width = imageCord.width;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    var img = new Image();
    img.setAttribute("crossOrigin", "use-credentials");
    ctx.lineWidth = "2";
    ctx.strokeStyle = "coral";
    ctx.rect(x1, y1, dragBoxCord.width, dragBoxCord.height);
    ctx.stroke();
    img.src = canvas.toDataURL(1.0);
    await this.uploadImage(img);
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
    return axios.post("/api/updateImageBox", body, config);
  };

  updateBox = (x1, y1, x2, y2, imageCord, dragBoxCord, imageElement) => {
    const body = {
      id: this.props.annotation.id,
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2
    };
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    return axios
      .patch(`/api/annotationsUpdateBox/`, body, config)
      .then(res => {
        this.createAndUploadImages(
          imageCord,
          dragBoxCord,
          imageElement,
          x1,
          y1
        );
      })
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  handleVerifyClick = () => {
    var dragBox = document.getElementById("dragBox");

    if (dragBox === null){
      Swal.fire({
        title: 'Error',
        text: 'No bounding box exists.',
        type: 'error',
        confirmButtonText: 'Okay'
      });
      return;
    }

    if (this.props.annotation.image) {
      this.postBoxImage(dragBox);
    }
    
    this.verifyAnnotation();
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

  render() {
    const { classes } = this.props;
    let annotation = this.props.annotation;

    if (this.state.x === null) {
      return <div>Loading...</div>;
    }

    return (
      <React.Fragment>
        <DialogModal
          title={"Confirm Annotation Edit"}
          message={this.state.conceptDialogMsg}
          placeholder={"Comments"}
          inputHandler={this.changeConcept}
          open={this.state.conceptDialogOpen}
          handleClose={this.handleConceptDialogClose}
        />
        {!this.state.end ? (
          <React.Fragment>
            {!annotation.image ? (
              <Typography className={classes.paper}>No Image</Typography>
            ) : (
              <div>
                <DragBoxContainer
                  className={classes.img}
                  dragBox={classes.dragBox}
                  drawDragBox={true}
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
            )}
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
              <Button
                className={classes.button}
                variant="contained"
                color="primary"
                onClick={this.handleVerifyClick}
              >
                Verify
              </Button>

              <IconButton aria-label="OnDemandVideo">
                <OndemandVideo onClick={this.videoDialogToggle} />
              </IconButton>
            </div>
            <div
              className={classes.buttonsContainer2}
              style={{ width: annotation.videowidth / 2 }}
            >
              <Grid container direction="row" alignItems="center">
                <Grid item>
                  <Avatar
                    src={`/api/conceptImages/${
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
                  <VideoDialogWrapped
                    annotation={annotation}
                    open={this.state.videoDialogOpen}
                    onClose={this.videoDialogToggle}
                  />
                </Grid>
              </Grid>
            </div>
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
            <div>
              <Typography className={classes.paper} variant="title">
                Annotation #{annotation.id}
              </Typography>
              <Typography className={classes.paper} variant="body2">
                Annotated by: {annotation.username}
              </Typography>
              <Typography className={classes.paper} variant="body2">
                Video: {annotation.filename}
                <IconButton>
                  <Description
                    style={{ fontSize: 20 }}
                    onClick={event =>
                      this.openVideoMetadata(event, { id: annotation.videoid })
                    }
                  />
                </IconButton>
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
              boolean logic rather than by passing in a variable as an
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

class VideoDialog extends React.Component {
  handleVideoDialogClose = () => {
    this.props.onClose();
  };

  render() {
    const { classes, onClose, selectedValue, open, ...other } = this.props;
    return (
      <Dialog
        maxWidth={false}
        onClose={this.handleVideoDialogClose}
        aria-labelledby="video-dialog-title"
        open={open}
        {...other}
      >
        <DialogTitle id="video-dialog-title">Annotation Video</DialogTitle>
        <div>
          <video
            id="video"
            width="800"
            height="450"
            src={
              "https://cdn.deepseaannotations.com/videos/" +
              this.props.annotation.id +
              "_tracking.mp4"
            }
            type="video/mp4"
            controls
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </Dialog>
    );
  }
}

VideoDialog.propTypes = {
  classes: PropTypes.object.isRequired,
  onClose: PropTypes.func,
  selectedValue: PropTypes.string
};

const VideoDialogWrapped = withStyles(styles)(VideoDialog);

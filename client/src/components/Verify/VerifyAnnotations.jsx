import React, { Component } from 'react';
import axios from 'axios';
import {
  withStyles,
  MuiThemeProvider,
  createMuiTheme
} from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import OndemandVideo from '@material-ui/icons/OndemandVideo';
import Photo from '@material-ui/icons/Photo';
import IconButton from '@material-ui/core/IconButton';
import blue from '@material-ui/core/colors/blue';
import Description from '@material-ui/icons/Description';
import Avatar from '@material-ui/core/Avatar';
import Grid from '@material-ui/core/Grid';
import Swal from 'sweetalert2';
import Hotkeys from 'react-hot-keys';

import DialogModal from '../Utilities/DialogModal';
import ConceptsSelected from '../Utilities/ConceptsSelected';
import DragBoxContainer from '../Utilities/DragBoxContainer';
import VideoMetadata from '../Utilities/VideoMetadata';

const styles = theme => ({
  button: {
    margin: theme.spacing()
  },
  img: {
    top: '50px'
  },
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gridGap: theme.spacing(3)
  },
  paper: {
    padding: theme.spacing()
  },
  dragBox: {
    margin: '0px',
    backgroundColor: 'transparent',
    border: '2px coral solid',
    borderStyle: 'ridge'
  },
  avatar: {
    backgroundColor: blue[100],
    color: blue[600]
  },
  icons: {
    float: 'right'
  },
  buttonsContainer1: {
    marginTop: '10px',
    float: 'left',
    margin: '0 auto'
  },
  buttonsContainer2: {
    float: 'left',
    margin: '0 auto'
  }
});

const theme = createMuiTheme({
  palette: {
    secondary: {
      main: '#565656'
    }
  }
});

class VerifyAnnotations extends Component {
  constructor(props) {
    super(props);
    const { annotation } = this.props;

    this.state = {
      disableVerify: false,
      concept: null,
      comment: annotation.comment,
      unsure: annotation.unsure,
      conceptDialogMsg: null,
      conceptDialogOpen: false,
      clickedConcept: null,
      x: annotation.x1,
      y: annotation.y1,
      width: annotation.x2 - annotation.x1,
      height: annotation.y2 - annotation.y1,
      videoDialogOpen: false /* Needed for dialog component */,
      drawDragBox: true,
      trackingStatus: null
    };
  }

  displayLoading = () => {
    const { tracking } = this.props;
    const { videoDialogOpen } = this.state;

    if (!tracking && !videoDialogOpen) {
      Swal.fire({
        title: 'Loading...',
        showConfirmButton: false,
        onBeforeOpen: () => {
          Swal.showLoading();
        }
      });
    }
  };

  componentDidMount = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.displayLoading();
  };

  handleKeyDown = (keyName, e) => {
    e.preventDefault();
    if (e.target === document.body) {
      if (keyName === 'r') {
        // reset shortcut
        this.resetState();
      } else if (keyName === 'd') {
        // delete shortcut
        this.handleDelete();
      } else if (keyName === 'i') {
        // ignore shortcut
        this.nextAnnotation();
      } else if (keyName === 'v') {
        // Verify shortcut
        this.handleVerifyClick();
      }
    }
  };

  verifyAnnotation = async () => {
    const { annotation } = this.props;
    const { concept, comment, unsure } = this.state;

    const body = {
      op: 'verifyAnnotation',
      id: annotation.id,
      conceptId: !concept ? null : concept.id,
      comment,
      unsure,
      oldConceptId: !concept ? null : annotation.conceptid
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    return axios
      .patch(`/api/annotations/`, body, config)
      .then(res => {
        this.nextAnnotation();
        return res.data;
      })
      .catch(error => {
        Swal.fire(error, '', 'error');
      });
  };

  resetState = () => {
    const { annotation } = this.props;

    this.setState({
      drawDragBox: true,
      disableVerify: false,
      concept: null,
      comment: annotation.comment,
      unsure: annotation.unsure,
      x: annotation.x1,
      y: annotation.y1,
      width: annotation.x2 - annotation.x1,
      height: annotation.y2 - annotation.y1
    });
  };

  toggleDragBox = () => {
    this.setState({
      drawDragBox: false
    });
  };

  nextAnnotation = () => {
    const { size, index, handleNext } = this.props;

    this.setState({
      trackingStatus: null
    });
    if (size === index + 1) {
      this.setState({
        end: true
      });
      return;
    }
    this.displayLoading();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleNext(this.resetState);
  };

  handleConceptDialogClose = () => {
    this.setState({
      conceptDialogOpen: false,
      conceptDialogMsg: null
    });
  };

  handleConceptClick = concept => {
    const { annotation } = this.props;

    this.setState({
      conceptDialogMsg: `Switch ${annotation.name} to ${concept.name}?`,
      conceptDialogOpen: true,
      clickedConcept: annotation.conceptid === concept.id ? null : concept
    });
  };

  changeConcept = (comment, unsure) => {
    const { clickedConcept } = this.state;

    this.setState({
      concept: clickedConcept,
      comment,
      unsure
    });
  };

  handleDelete = () => {
    const { annotation } = this.props;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: {
        id: annotation.id
      }
    };
    axios
      .delete('/api/annotations', config)
      .then(res => {
        return res.data;
      })
      .catch(error => {
        Swal.fire(error, '', 'error');
      });
    this.nextAnnotation();
  };

  postBoxImage = async dragBox => {
    const { x, y, width, height } = this.state;
    const dragBoxCord = dragBox.getBoundingClientRect();
    const imageElement = document.getElementById('image');
    const imageCord = imageElement.getBoundingClientRect('dragBox');
    const x1 = x;
    const y1 = y;
    const x2 = x + parseInt(width, 0);
    const y2 = y + parseInt(height, 0);

    const { annotation } = this.props;

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
        this.updateBox(x1, y1, x2, y2);
      }

      this.verifyAnnotation();
    } catch {
      console.log('Unable to Verify');
      this.nextAnnotation();
    }
  };

  createAndUploadImages = (imageCord, dragBoxCord, imageElement, x1, y1) => {
    const canvas = document.createElement('canvas');
    canvas.height = imageCord.height;
    canvas.width = imageCord.width;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const img = new window.Image();
    img.setAttribute('crossOrigin', 'use-credentials');
    ctx.lineWidth = '2';
    ctx.strokeStyle = 'coral';
    ctx.rect(x1, y1, dragBoxCord.width, dragBoxCord.height);
    ctx.stroke();
    img.src = canvas.toDataURL(1.0);
    this.uploadImage(img);
  };

  uploadImage = img => {
    const { annotation } = this.props;
    const buf = Buffer.from(
      img.src.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    );
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      buf,
      name: annotation.imagewithbox
    };
    try {
      axios.post('/api/annotations/images', body, config);
    } catch {
      Swal.fire('ERR: uploading image', '', 'error');
    }
  };

  updateBox = (x1, y1, x2, y2) => {
    const { annotation } = this.props;
    const body = {
      op: 'updateBoundingBox',
      x1,
      y1,
      x2,
      y2,
      oldx1: annotation.x1,
      oldy1: annotation.y1,
      oldx2: annotation.x2,
      oldy2: annotation.y2,
      id: annotation.id
    };
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios.patch(`/api/annotations/`, body, config).catch(error => {
      Swal.fire(error, '', 'error');
    });
  };

  handleVerifyClick = () => {
    const dragBox = document.getElementById('dragBox');

    if (dragBox === null) {
      Swal.fire({
        title: 'Error',
        text: 'No bounding box exists.',
        type: 'error',
        confirmButtonText: 'Okay'
      });
      return;
    }

    this.postBoxImage(dragBox);
  };

  videoDialogToggle = () => {
    const { videoDialogOpen } = this.state;
    this.setState({
      videoDialogOpen: !videoDialogOpen
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
        return 'Bad Tracking';
      case true:
        return 'Good Tracking';
      default:
        return 'Tracking Not Verified';
    }
  };

  markTracking = async flag => {
    const { annotation, tracking } = this.props;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      flag
    };
    try {
      await axios.patch(
        `/api/annotations/tracking/${annotation.id}`,
        body,
        config
      );
      this.setState({
        trackingStatus: flag
      });
      Swal.fire('Successfully Marked', '', 'success');
      if (tracking) {
        this.nextAnnotation();
      }
    } catch (error) {
      Swal.fire('Error marking video as bad', '', 'error');
    }
  };

  optionButtons = annotation => {
    const { classes } = this.props;
    const { disableVerify, videoDialogOpen } = this.state;
    return (
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
          disabled={disableVerify}
        >
          Verify
        </Button>
        {!videoDialogOpen ? (
          <IconButton
            onClick={this.videoDialogToggle}
            aria-label="OnDemandVideo"
          >
            <OndemandVideo />
          </IconButton>
        ) : (
          <IconButton onClick={this.videoDialogToggle} aria-label="Photo">
            <Photo />
          </IconButton>
        )}
      </div>
    );
  };

  annotationConcept = annotation => {
    const { classes } = this.props;
    const { concept } = this.state;

    return (
      <div
        className={classes.buttonsContainer2}
        style={{ width: annotation.videowidth / 2 }}
      >
        <Grid container direction="row" alignItems="center">
          <Grid item>
            <Avatar
              src={`https://cdn.deepseaannotations.com/concept_images/${
                !concept ? annotation.picture : concept.picture
              }`}
            />
          </Grid>
          <Grid item>
            <h3>{!concept ? annotation.name : concept.name}</h3>
          </Grid>
          <Grid item xs>
            <ConceptsSelected handleConceptClick={this.handleConceptClick} />
          </Grid>
        </Grid>
      </div>
    );
  };

  annotationDetails = annotation => {
    const { classes } = this.props;
    const { concept, comment, unsure } = this.state;
    return (
      <div>
        <Typography className={classes.paper} variant="h5">
          Annotation #{annotation.id}
        </Typography>
        <Typography className={classes.paper} variant="body2">
          Video: {`${annotation.videoid} ${annotation.filename}`}
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
          Time: {Math.floor(annotation.timeinvideo / 60)} minutes{' '}
          {Math.floor(annotation.timeinvideo % 60)} seconds
        </Typography>
        <Typography className={classes.paper} variant="body2">
          Concept: {!concept ? annotation.name : concept.name}
        </Typography>
        {comment !== '' ? (
          <Typography className={classes.paper} variant="body2">
            Comment: {comment}
          </Typography>
        ) : (
          ''
        )}
        {unsure !== null ? (
          <Typography className={classes.paper} variant="body2">
            Unsure:{' '}
            {unsure
              .toString()
              .charAt(0)
              .toUpperCase() + unsure.toString().slice(1)}
          </Typography>
        ) : (
          ''
        )}
      </div>
    );
  };

  render() {
    const {
      classes,
      annotation,
      tracking,
      videoDialogOpen,
      index,
      size,
      toggleSelection,
      socket,
      loadVideos
    } = this.props;
    const {
      x,
      y,
      unsure,
      conceptDialogOpen,
      conceptDialogMsg,
      comment,
      end,
      trackingStatus,
      drawDragBox,
      width,
      height,
      openedVideo
    } = this.state;

    if (x === null) {
      return <div>Loading...</div>;
    }

    return (
      <React.Fragment>
        {conceptDialogOpen && (
          <DialogModal
            title="Confirm Annotation Edit"
            message={conceptDialogMsg}
            placeholder="Comments"
            comment={comment}
            inputHandler={this.changeConcept}
            open
            handleClose={this.handleConceptDialogClose}
            unsure={unsure}
          />
        )}
        {!end ? (
          <React.Fragment>
            {tracking || videoDialogOpen ? (
              <div>
                <DragBoxContainer>
                  <video
                    id="video"
                    width="1300"
                    height="730"
                    src={`https://cdn.deepseaannotations.com/videos/${annotation.id}_tracking.mp4`}
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
                    {tracking ? 'Ignore' : 'Next'}
                  </Button>
                  {videoDialogOpen ? (
                    <IconButton
                      onClick={this.videoDialogToggle}
                      aria-label="Photo"
                    >
                      <Photo />
                    </IconButton>
                  ) : (
                    ''
                  )}
                </div>
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <div>
                  <Typography variant="subtitle1" className={classes.button}>
                    <b>Status: </b>{' '}
                    {!trackingStatus
                      ? this.getStatus(annotation.tracking_flag)
                      : this.getStatus(trackingStatus)}
                  </Typography>
                  <Typography className={classes.paper}>
                    {index + 1} of {size}
                  </Typography>
                </div>
              </div>
            ) : (
              <div>
                <Hotkeys keyName="r, d, i, v" onKeyDown={this.handleKeyDown} />
                <div
                  style={{
                    width: annotation.videowidth,
                    height: annotation.videoheight
                  }}
                >
                  <DragBoxContainer
                    className={classes.img}
                    dragBox={classes.dragBox}
                    drawDragBoxProp={drawDragBox}
                    toggleDragBox={this.toggleDragBox}
                    size={{
                      width,
                      height
                    }}
                    position={{ x, y }}
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
                      src={`https://cdn.deepseaannotations.com/test/${annotation.image}`}
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
                  {index + 1} of {size}
                </Typography>
                {this.optionButtons(annotation)}
                {this.annotationConcept(annotation)}
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
              </div>
            )}
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Typography className={classes.paper}>Finished</Typography>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              onClick={toggleSelection}
            >
              Filter Annotations
            </Button>
          </React.Fragment>
        )}
        {openedVideo && (
          <VideoMetadata
            open
            handleClose={this.closeVideoMetadata}
            openedVideo={openedVideo}
            socket={socket}
            loadVideos={loadVideos}
            model={false}
          />
        )}
        {this.annotationDetails(annotation)}
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(VerifyAnnotations);

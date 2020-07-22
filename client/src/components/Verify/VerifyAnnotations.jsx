// eslint-disable-next-line max-classes-per-file
import React, { Component } from 'react';
import axios from 'axios';
import {
  withStyles,
  MuiThemeProvider,
  createMuiTheme
} from '@material-ui/core/styles';
import { Typography, DialogTitle, DialogContent } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import OndemandVideo from '@material-ui/icons/OndemandVideo';
import IconButton from '@material-ui/core/IconButton';
import blue from '@material-ui/core/colors/blue';
import Description from '@material-ui/icons/Description';
import Avatar from '@material-ui/core/Avatar';
import Grid from '@material-ui/core/Grid';
import Swal from 'sweetalert2/src/sweetalert2';
import Hotkeys from 'react-hot-keys';
import Dialog from '@material-ui/core/Dialog';

import DialogModal from '../Utilities/DialogModal';
import ConceptsSelected from '../Utilities/ConceptsSelected';
import DragBoxContainer from '../Utilities/DragBoxContainer';
import VideoMetadata from '../Utilities/VideoMetadata';
import Boxes from './Boxes';
import TrackingVideos from './TrackingVideos';

const styles = theme => ({
  button: {
    marginRight: theme.spacing(2)
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

function Legend() {
  function LegendItem(props) {
    const { color, label } = props;
    return (
      <div style={{ padding: '10px' }}>
        <div
          style={{
            display: 'inline-block',
            marginRight: '10px',
            backgroundColor: color,
            width: '10px',
            height: '10px'
          }}
        />
        <Typography style={{ display: 'inline' }}>{label}</Typography>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', top: '10px', left: '-220px' }}>
      <Paper style={{ width: '200px' }}>
        <LegendItem color="red" label="Hovered" />
        <LegendItem color="lightgreen" label="Verified in Collection" />
        <LegendItem
          color="DodgerBlue"
          label="Ignored / Outside of Collection (User)"
        />
        <LegendItem
          color="Yellow"
          label="Ignored / Outside of Collection (Model)"
        />
        <LegendItem color="coral" label="Current Unverified in Collection" />
      </Paper>
    </div>
  );
}

class VerifyAnnotations extends Component {
  toastPopup = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });

  constructor(props) {
    super(props);
    const { annotation } = this.props;
    const videoDialogOpen = JSON.parse(localStorage.getItem('videoDialogOpen'));

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
      videoDialogOpen,
      detailDialogOpen: false,
      annotation: annotation
    };
  }

  componentDidMount = async () => {
    const { displayLoading } = this.props;

    displayLoading();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await this.loadBoxes();
  };

  componentDidUpdate = async prevProps => {
    const { annotating } = this.props;
    if (annotating !== prevProps.annotating) {
      await this.loadBoxes();
    }
  };

  handleKeyDown = (keyName, e) => {
    const { annotation } = this.props;

    e.preventDefault();
    if (e.target === document.body) {
      if (keyName === 'r') {
        // reset shortcut
        this.resetCurrentBox(false);
      } else if (keyName === 'd') {
        // delete shortcut
        this.handleDelete('current', annotation.id);
      } else if (keyName === 'i') {
        // ignore shortcut
        this.nextAnnotation(true);
      } else if (keyName === 'v') {
        // Verify shortcut
        this.handleVerifyClick();
      }
    }
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      detailDialogOpen: !prevState.detailDialogOpen
    }));
  };

  loadBoxes = async () => {
    const {
      annotation,
      selectedAnnotationCollections,
      annotating
    } = this.props;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      params: {
        selectedAnnotationCollections
      }
    };

    try {
      const data = await axios.get(
        `/api/annotations/boxes/${annotating ? -1 : annotation.id}` +
          `?videoid=${annotation.videoid}&timeinvideo=${annotation.timeinvideo}`,
        config
      );
      let [vBoxTemp, boColTemp] = [[], []];
      if (data.data.length > 0) {
        data.data.forEach(row => {
          if (row.verified_flag === 1) {
            vBoxTemp = row.box;
          } else {
            // case for when flag is 0 or 3
            boColTemp = boColTemp.concat(row.box);
          }
        });
        this.setState({
          boxesOutsideCol: boColTemp,
          verifiedBoxes: vBoxTemp
        });
      } else {
        this.setState({
          boxesOutsideCol: [],
          verifiedBoxes: []
        });
      }
      Swal.close();
    } catch (error) {
      console.log(error);
    }
  };

  resetCurrentBox = boxOnly => {
    const { annotation, annotating } = this.props;

    if (boxOnly) {
      this.setState({
        x: annotating ? 0 : annotation.x1,
        y: annotating ? 0 : annotation.y1,
        width: annotating ? 0 : annotation.x2 - annotation.x1,
        height: annotating ? 0 : annotation.y2 - annotation.y1
      });
      return;
    }

    this.setState({
      disableVerify: false,
      concept: null,
      comment: annotating ? '' : annotation.comment,
      unsure: annotating ? false : annotation.unsure,
      x: annotating ? 0 : annotation.x1,
      y: annotating ? 0 : annotation.y1,
      width: annotating ? 0 : annotation.x2 - annotation.x1,
      height: annotating ? 0 : annotation.y2 - annotation.y1
    });
  };

  resetState = async () => {
    const { annotation, annotating, displayLoading } = this.props;

    displayLoading();
    await this.loadBoxes();
    this.setState({
      disableVerify: false,
      concept: null,
      comment: annotating ? '' : annotation.comment,
      unsure: annotating ? false : annotation.unsure,
      x: annotating ? 0 : annotation.x1,
      y: annotating ? 0 : annotation.y1,
      width: annotating ? 0 : annotation.x2 - annotation.x1,
      height: annotating ? 0 : annotation.y2 - annotation.y1
    });
  };

  prevAnnotation = async () => {
    const { handlePrev } = this.props;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    handlePrev(this.resetState);
  };

  nextAnnotation = async ignoreFlag => {
    const { handleNext, populateIgnoreList, annotation } = this.props;

    if (ignoreFlag) {
      populateIgnoreList(annotation);
    }

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
    const { annotation, annotating } = this.props;

    this.setState({
      conceptDialogMsg: annotating
        ? `Annotate as ${concept.name}?`
        : `Switch ${annotation.name} to ${concept.name}?`,
      conceptDialogOpen: true,
      clickedConcept: annotation.conceptid === concept.id ? null : concept
    });
  };

  changeConcept = (comment, unsure) => {
    const { annotating } = this.props;
    const { clickedConcept } = this.state;

    this.setState(
      {
        concept: clickedConcept,
        comment,
        unsure
      },
      () => {
        if (annotating) {
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
        }
      }
    );
  };

  handleDelete = async (type, id) => {
    const { removeFromIgnoreList, displayLoading} = this.props;
    const { boxesOutsideCol, verifiedBoxes } = this.state;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: { id }
    };

    displayLoading();
    axios
      .delete('/api/annotations', config)
      .then(async () => {
        Swal.close();
        this.toastPopup.fire({
          type: 'success',
          title: 'Deleted!!'
        });

        switch (type) {
          case 'current':
            this.nextAnnotation(false);
            break;
          case 'ignored':
            removeFromIgnoreList(id);
            break;
          case 'outside':
            const outside = boxesOutsideCol.filter(x => x.id !== id);
            this.setState({
              boxesOutsideCol: outside
            });
            break;
          case 'verified':
            const verified = verifiedBoxes.filter(x => x.id !== id);
            this.setState({
              verifiedBoxes: verified
            });
            break;
          // no default
        }
        this.resetCurrentBox(true);
      })
      .catch(error => {
        Swal.fire(error, '', 'error');
      });
  };

  postAnnotation = () => {
    const { annotation } = this.props;
    const { x, y, width, height, concept, comment, unsure } = this.state;
    const x1 = x;
    const y1 = y;
    const x2 = x + parseInt(width, 0);
    const y2 = y + parseInt(height, 0);
    if (
      x1 < 0 ||
      y1 < 0 ||
      x2 > annotation.videowidth ||
      y1 > annotation.videoheight ||
      parseInt(width, 0) < 10 ||
      parseInt(height, 0) < 10
    ) {
      Swal.fire({
        title: 'Error',
        text: 'Invalid Bounding Box',
        type: 'error',
        confirmButtonText: 'Okay'
      });
      return;
    }

    const body = {
      conceptId: concept ? concept.id : annotation.conceptid,
      videoId: annotation.videoid,
      timeinvideo: annotation.timeinvideo,
      x1,
      y1,
      x2,
      y2,
      videoWidth: annotation.videowidth,
      videoHeight: annotation.videoheight,
      image: annotation.image.split('.png')[0],
      comment,
      unsure
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    axios
      .post('/api/annotations', body, config)
      .then(async res => {
        Swal.fire({
          type: 'success',
          title: res.data.message
        });
        let annotationData = JSON.parse(res.data.value);
        let newAnnotation = {
          admin: false,
          id: annotationData.id,
          name: concept ? concept.name : annotation.name,
          userid: annotationData.userid,
          videoheight: annotation.videoheight,
          videowidth: annotation.videowidth,
          x1,
          x2,
          y1,
          y2
        };
        this.setState(
          prevState => ({
            boxesOutsideCol: [newAnnotation, ...prevState.boxesOutsideCol]
          }),
          () => {
            console.log(this.state.boxesOutsideCol);
            this.resetCurrentBox();
          }
        );
      })
      .catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
        if (!error.response) {
          return;
        }
        const errMsg =
          error.response.data.detail || error.response.data.message || 'Error';
        console.log(errMsg);
      });
  };

  postBoxImage = async () => {
    const { annotation, annotating } = this.props;
    const { x, y, width, height } = this.state;
    const x1 = x;
    const y1 = y;
    const x2 = x + parseInt(width, 0);
    const y2 = y + parseInt(height, 0);

    try {
      if (annotating) {
        this.postAnnotation();
      } else {
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
          this.updateBox(x1, y1, x2, y2);
        }
        this.verifyAnnotation();
      }
    } catch (error) {
      console.log(error);
      console.log('Unable to Verify');
      this.nextAnnotation(false);
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
      id: annotation.id,
      model: annotation.admin === null ? true : false
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

  verifyAnnotation = async () => {
    const { annotation } = this.props;
    const { concept, comment, unsure } = this.state;

    const body = {
      op: 'verifyAnnotation',
      id: annotation.id,
      conceptId: !concept ? null : concept.id,
      comment,
      unsure,
      oldConceptId: !concept ? null : annotation.conceptid,
      model: annotation.admin === null ? true : false
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
        this.toastPopup.fire({
          type: 'success',
          title: 'Verified!!'
        });
        this.nextAnnotation(false);
        return res.data;
      })
      .catch(error => {
        Swal.fire(error, '', 'error');
      });
  };

  checkValidDragBox = () => {
    const { annotation } = this.props;
    const { x, y, width, height } = this.state;
    if (
      x + parseInt(width, 0) > annotation.videowidth ||
      y + parseInt(height, 0) > annotation.videoheight ||
      x < 0 ||
      y < 0 ||
      width < 10 ||
      height < 10
    ) {
      return false;
    }
    return true;
  };

  handleVerifyClick = () => {
    const dragBox = document.getElementById('dragBox');
    if (dragBox === null || !this.checkValidDragBox()) {
      Swal.fire({
        title: 'Error',
        text: 'Invalid Bounding Box',
        type: 'error',
        confirmButtonText: 'Okay'
      });
      return;
    }

    this.postBoxImage(dragBox);
  };

  videoDialogToggle = () => {
    const { videoDialogOpen } = this.state;
    localStorage.setItem('videoDialogOpen', !videoDialogOpen);
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

  optionButtons = annotation => {
    const { classes, resetLocalStorage, annotating, index } = this.props;
    const { disableVerify } = this.state;
    return (
      <div
        className={classes.buttonsContainer1}
        style={{ width: (2 * annotation.videowidth) / 3 }}
      >
        <Button
          className={classes.button}
          variant="contained"
          color="primary"
          onClick={resetLocalStorage}
        >
          Reset Selections
        </Button>
        {annotating ? (
          ''
        ) : (
          <>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              onClick={this.toggleDetails}
            >
              Details
            </Button>
            <MuiThemeProvider theme={theme}>
              <Button
                className={classes.button}
                variant="contained"
                color="secondary"
                onClick={() => this.handleDelete('current', annotation.id)}
              >
                Delete
              </Button>
            </MuiThemeProvider>
            <Button
              className={classes.button}
              variant="contained"
              onClick={() => this.resetCurrentBox(false)}
            >
              Reset Box
            </Button>
          </>
        )}
        <Button
          className={classes.button}
          variant="contained"
          disabled={index === 0 && !annotating}
          onClick={() => this.prevAnnotation()}
        >
          Back
        </Button>
        <Button
          className={classes.button}
          variant="contained"
          onClick={() => this.nextAnnotation(true)}
        >
          {annotating ? 'Next Frame' : 'Ignore'}
        </Button>
        {annotating ? (
          ''
        ) : (
          <Button
            className={classes.button}
            variant="contained"
            color="primary"
            onClick={this.handleVerifyClick}
            disabled={disableVerify}
          >
            Verify
          </Button>
        )}
        <IconButton
          onClick={this.videoDialogToggle}
          aria-label="OnDemandVideo"
          disabled={annotation.id !== annotation.originalid}
        >
          <OndemandVideo />
        </IconButton>
      </div>
    );
  };

  annotationConcept = annotation => {
    const { classes, annotating } = this.props;
    const { concept } = this.state;

    return (
      <div
        className={classes.buttonsContainer2}
        style={{ width: annotation.videowidth / 3 }}
      >
        <Grid container direction="row" alignItems="center">
          {annotating ? (
            ''
          ) : (
            <>
              <Grid item>
                <Avatar
                  src={`https://cdn.deepseaannotations.com/concept_images/${
                    !concept ? annotation.picture : concept.picture
                  }`}
                />
              </Grid>
              <Grid item>
                <Typography variant="subtitle1" style={{ marginLeft: '10px' }}>
                  {!concept ? annotation.name : concept.name}
                </Typography>
              </Grid>
            </>
          )}
          <Grid item xs>
            <ConceptsSelected
              disableConcept={this.state.disableConcept}
              handleConceptClick={this.handleConceptClick}
            />
          </Grid>
        </Grid>
      </div>
    );
  };

  annotationDetails = annotation => {
    const { classes } = this.props;
    const { concept, comment, unsure, detailDialogOpen } = this.state;
    return (
      <Dialog onClose={this.toggleDetails} open={detailDialogOpen}>
        <div>
          <DialogTitle>Annotation #{annotation.id}</DialogTitle>
          <DialogContent>
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
          </DialogContent>
        </div>
      </Dialog>
    );
  };

  loadDialogModal = () => {
    const { unsure, conceptDialogMsg, comment } = this.state;
    return (
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
    );
  };

  render() {
    const {
      classes,
      annotation,
      tracking,
      index,
      size,
      socket,
      loadVideos,
      excludeTracking,
      collectionFlag,
      resetLocalStorage,
      ignoredAnnotations,
      annotating
    } = this.props;

    const {
      x,
      y,
      conceptDialogOpen,
      width,
      height,
      openedVideo,
      videoDialogOpen,
      verifiedBoxes,
      boxesOutsideCol
    } = this.state;

    return (
      <>
        {conceptDialogOpen && this.loadDialogModal()}
        <>
          {tracking || videoDialogOpen ? (
            <TrackingVideos
              annotation={annotation}
              excludeTracking={excludeTracking}
              collectionFlag={collectionFlag}
              videoDialogOpen={videoDialogOpen}
              index={index}
              size={size}
              resetLocalStorage={resetLocalStorage}
              videoDialogToggle={this.videoDialogToggle}
              nextAnnotation={this.nextAnnotation}
            />
          ) : (
            <div style={{ position: 'absolute', left: '250px' }}>
              <Hotkeys keyName="r, d, i, v" onKeyDown={this.handleKeyDown} />
              <div
                style={{
                  width: annotation.videowidth,
                  height: annotation.videoheight
                }}
              >
                <DragBoxContainer
                  dragBox={classes.dragBox}
                  drawDragBoxProp={!annotating}
                  size={{
                    width,
                    height
                  }}
                  videoWidth={annotation.videowidth}
                  videoHeight={annotation.videoheight}
                  position={{ x, y }}
                  onDragStop={(e, d) => {
                    this.setState({ x: d.x, y: d.y });
                  }}
                  onResize={(e, direction, ref, delta, position) => {
                    this.setState(
                      {
                        width: ref.style.width,
                        height: ref.style.height,
                        ...position
                      },
                      () => {
                        this.setState({
                          disableConcept:
                            ref.style.width === 0 && ref.style.height === 0
                              ? true
                              : false
                        });
                      }
                    );
                  }}
                >
                  <Boxes
                    handleDelete={this.handleDelete}
                    boxesOutsideCol={boxesOutsideCol}
                    verifiedBoxes={verifiedBoxes}
                    ignoredAnnotations={ignoredAnnotations}
                    annotation={annotation}
                  />
                  <img
                    id="image"
                    onLoad={this.loaded}
                    onError={this.handleErrImage}
                    className={classes.img}
                    src={`https://cdn.deepseaannotations.com/annotation_frames/${annotation.image}`}
                    alt="error"
                    crossOrigin="use-credentials"
                    style={{
                      width: annotation.videowidth,
                      height: annotation.videoheight
                    }}
                  />
                </DragBoxContainer>
                <Legend />
              </div>
              <Typography style={{ marginTop: '10px' }}>
                {index + 1} of {size}
              </Typography>
              {this.optionButtons(annotation)}
              {this.annotationConcept(annotation)}
              {this.annotationDetails(annotation)}
            </div>
          )}
        </>
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
      </>
    );
  }
}

export default withStyles(styles)(VerifyAnnotations);

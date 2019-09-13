import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import DragBoxContainer from '../Utilities/DragBoxContainer';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import { Typography } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import Photo from '@material-ui/icons/Photo';
import axios from 'axios';
import Swal from 'sweetalert2/src/sweetalert2';

const styles = theme => ({
  buttonsContainer1: {
    marginTop: '10px',
    float: 'left',
    margin: '0 auto'
  },
  button: {
    marginRight: theme.spacing(2)
  }
});

class TrackingVideos extends Component {
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
    const { annotation, tracking, nextAnnotation } = this.props;
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
        nextAnnotation(false);
      }
    } catch (error) {
      Swal.fire('Error marking video as bad', '', 'error');
    }
  };

  render() {
    const {
      classes,
      annotation,
      resetLocalStorage,
      excludeTracking,
      collectionFlag,
      videoDialogOpen,
      trackingStatus,
      index,
      size,
      videoDialogToggle,
      nextAnnotation
    } = this.props;
    return (
      <Grid container>
        <Grid item xs />
        <Grid item xs>
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
            style={{ width: annotation.videowidth }}
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
              color="primary"
              onClick={resetLocalStorage}
            >
              Reset Selections
            </Button>
            <Button
              className={classes.button}
              variant="contained"
              onClick={() => nextAnnotation(false)}
              disabled={!excludeTracking && collectionFlag > 0}
            >
              Next
            </Button>
            {videoDialogOpen ? (
              <IconButton onClick={videoDialogToggle} aria-label="Photo">
                <Photo />
              </IconButton>
            ) : (
              ''
            )}
          </div>
          <br />
          <br />
          <br />
          <div>
            <Typography variant="subtitle2" className={classes.button}>
              {!excludeTracking && collectionFlag > 0
                ? 'Next disabled because the collection might contain tracking annotations'
                : ''}
            </Typography>
            <Typography variant="subtitle1" className={classes.button}>
              <b>Status: </b>{' '}
              {!trackingStatus
                ? this.getStatus(annotation.tracking_flag)
                : this.getStatus(trackingStatus)}
            </Typography>
            <Typography style={{ marginTop: '10px' }}>
              {index + 1} of {size}
            </Typography>
          </div>
        </Grid>
        <Grid item xs />
      </Grid>
    );
  }
}

export default withStyles(styles)(TrackingVideos);

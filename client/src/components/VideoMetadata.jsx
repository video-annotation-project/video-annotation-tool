import React, { Component } from 'react';
import axios from 'axios';

import Input from '@material-ui/core/Input';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import Radio from '@material-ui/core/Radio';
import { withStyles } from '@material-ui/core/styles';




const styles = theme => ({
  dialogStyle: {
    width: theme.spacing.unit * 50,
    height: theme.spacing.unit * 60,
    boxShadow: theme.shadows[5],
    margin: 'auto',
    outline: 'none'
  },
});

class VideoMetadata extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoMetadata: null,
      videoType: null,
      isLoaded: false
    };
  }

  componentDidMount = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.get(
      '/api/videos/' + this.props.openedVideoid,
      config
    ).then(videoMetadata => {
      console.log('Loaded');
      console.log(videoMetadata);
      this.setState({
        videoMetadata: videoMetadata.data[0],
        videoType: this.props.openedVideoType,
        isLoaded: true
      });
    }).catch(error => {
      console.log('Error in VideoMetadata.jsx get /api/videoMetadata/');
      console.log(error);
    })
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.updateDescription();
    }
    else {
      let videoMetadata = this.state.videoMetadata;
      videoMetadata.description = e.target.value + e.key;
      this.setState({
        videoMetadata: JSON.parse(JSON.stringify(videoMetadata))
      });
    }
  };

  update = () => {
    const body = {
      'description': this.state.videoMetadata.description
    }
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.patch(
      '/api/videos/' + this.props.openedVideoid,
      body,
      config
    ).then(updateRes => {
      console.log(updateRes);
    }).catch(error => {
      console.log('Error in VideoMetadata.jsx patch /api/videos');
      console.log(error.response.data);
    })
    this.props.handleClose();
  };

  handleVideoTypeChange = (event) => {
    this.setState({
      videoType: event.target.value
    })
  }

  render() {
    const { classes, openedVideoid } = this.props;
    const { isLoaded, videoType } = this.state;
    if (!isLoaded) {
      return <div>Loading...</div>
    }
    const {
      filename,
      description,
      gpsstart,
      gpsstop,
      startdepth,
      enddepth,
      starttime,
      endtime,
      userswatching,
    } = this.state.videoMetadata;

    return (
      <Dialog
        open={this.props.open}
        aria-labelledby="form-dialog-title"
      >
        <div className={classes.dialogStyle}>
          <DialogTitle id="form-dialog-title">
            <small>
              Video:{openedVideoid}<br />
              {filename}
            </small>

          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Users Watching: {userswatching.join(', ')}<br />
              GPS start: {gpsstart.x + ', ' + gpsstart.y}<br />
              GPS stop: {gpsstop.x + ', ' + gpsstop.y}<br />
              Start Depth: {startdepth}<br />
              End Depth: {enddepth}<br />
              Start Time: {starttime}<br />
              End Time: {endtime}<br />
            </DialogContentText>
            <br />
            <Input
              onKeyPress={this.handleKeyPress}
              autoFocus
              id="concept"
              type="text"
              defaultValue={description}
              placeholder={'Description'}
              multiline
            />
          </DialogContent>
          <Radio
            checked={videoType==='unwatched'}
            onChange={this.handleVideoTypeChange}
            value="unwatched"
            color="default"
          />
          Unwatched
          <Radio
            checked={videoType==='annotated'}
            onChange={this.handleVideoTypeChange}
            value="annotated"
            color="default"
          />
          Annotated
          <Radio
            checked={videoType==='inProgress' | videoType==='myInProgress'}
            onChange={this.handleVideoTypeChange}
            value="myInProgress"
            color="default"
          />
          In Progress
          <DialogActions>
            <Button onClick={this.props.handleClose} color="primary">
              Cancel
            </Button>
            <Button onClick={this.update} color="primary">
              Update
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    );
  }
}

export default withStyles(styles)(VideoMetadata);

import React, { Component } from 'react';
import Input from '@material-ui/core/Input';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import axios from 'axios';

const styles = theme => ({
  paper: {
    width: theme.spacing.unit*50,
    height: theme.spacing.unit*55,
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
      '/api/videos/'+this.props.videoid,
      config
    ).then(videoMetadata => {
      this.setState({
        videoMetadata: videoMetadata.data[0],
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

  updateDescription = () => {
    const body = {
      'description': this.state.videoMetadata.description
    }
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.patch(
      '/api/videos/'+this.props.videoid,
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

  render() {
    const {classes, videoid} = this.props;
    const { isLoaded } = this.state;
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
        <div className={classes.paper}>
          <DialogTitle id="form-dialog-title">
            <small>
              Video:{videoid}<br/>
              {filename}
            </small>

          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Users Watching: {userswatching.join(', ')}<br/>
              GPS start: {gpsstart.x+', '+gpsstart.y}<br/>
              GPS stop: {gpsstop.x+', '+gpsstop.y}<br/>
              Start Depth: {startdepth}<br/>
              End Depth: {enddepth}<br/>
              Start Time: {starttime}<br/>
              End Time: {endtime}<br/>
            </DialogContentText>
            <br/>
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
          <DialogActions>
            <Button onClick={this.props.handleClose} color="primary">
              Cancel
            </Button>
            <Button onClick={this.updateDescription} color="primary">
              Update Description
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    );
  }
}

export default withStyles(styles)(VideoMetadata);

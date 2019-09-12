import React, { Component } from 'react';
import axios from 'axios';
import Input from '@material-ui/core/Input';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import Radio from '@material-ui/core/Radio';
import { withStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import Summary from './Summary';

const styles = theme => ({
  dialogStyle: {
    width: theme.spacing(50),
    height: theme.spacing(65),
    boxShadow: theme.shadows[5],
    margin: 'auto',
    outline: 'none'
  },
  descriptionInput: {
    float: 'left',
    marginRight: '10px'
  }
});

class VideoMetadata extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoMetadata: null,
      videoStatus: null,
      isLoaded: false,
      descriptionOpen: false,
      summary: null
    };
  }

  componentDidMount = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const { openedVideo } = this.props;
    axios
      .get(`/api/videos/${openedVideo.id}`, config)
      .then(response => {
        // Logic to check video's status from user checkpoints
        const username = localStorage.getItem('username');
        const usersWatching = response.data[0].userswatching;
        const usersFinished = response.data[0].usersfinished;
        const userIndex = usersWatching.indexOf(username);
        let videoStatus = 'inProgress';

        if (userIndex === -1) {
          videoStatus = 'unwatched';
        } else if (usersFinished[userIndex]) {
          videoStatus = 'annotated';
        }
        this.setState({
          videoMetadata: response.data[0],
          videoStatus,
          isLoaded: true
        });
      })
      .catch(error => {
        console.log('Error in VideoMetadata.jsx get /api/videoMetadata/');
        console.log(error);
      });
  };

  handleKeyPress = e => {
    if (e.key === 'Enter') {
      this.update();
    } else {
      const { videoMetadata } = this.state;
      videoMetadata.description = e.target.value + e.key;
      this.setState({
        videoMetadata: JSON.parse(JSON.stringify(videoMetadata))
      });
    }
  };

  update = () => {
    const { handleClose } = this.props;
    this.updateVideoDescription();
    this.updateVideoCheckpoint();
    handleClose();
  };

  updateVideoDescription = () => {
    const { openedVideo } = this.props;
    const { videoMetadata } = this.state;
    const body = {
      description: videoMetadata.description,
      goodvideo: videoMetadata.goodvideo
    };
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .patch(`/api/videos/${openedVideo.id}`, body, config)
      .then(updateRes => {
        console.log(updateRes);
      })
      .catch(error => {
        console.log('Error in VideoMetadata.jsx patch /api/videos');
        console.log(error.response.data);
      });
  };

  updateVideoCheckpoint = () => {
    const { openedVideo, socket, loadVideos } = this.props;
    const { videoStatus } = this.state;

    const config = {
      url: `/api/videos/checkpoints/${openedVideo.id}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: {
        timeinvideo: openedVideo.timeinvideo,
        finished: videoStatus === 'annotated'
      }
    };
    config.method = videoStatus === 'unwatched' ? 'delete' : 'put';
    axios
      .request(config)
      .then(res => {
        loadVideos();
        socket.emit('refresh videos');
        console.log(`Changed: ${res.data.message}`);
      })
      .catch(error => {
        console.log(`Error in /api/videos ${config.method}`);
        console.log(error);
      });
  };

  openVideoSummary = async event => {
    event.stopPropagation();

    this.setState({
      descriptionOpen: true,
      summary: await this.getSummary()
    });
  };

  closeVideoSummary = () => {
    this.setState({
      descriptionOpen: false,
      summary: null
    });
  };

  getSummary = () => {
    const { openedVideo } = this.props;
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios
      .get(`/api/videos/summary/${openedVideo.id}`, config)
      .then(summary => {
        return summary;
      })
      .catch(error => {
        console.log('Error in VideoMetadata.jsx patch /api/videos/summary');
        console.log(error.response.data);
      });
  };

  handleVideoStatusChange = event => {
    this.setState({
      videoStatus: event.target.value
    });
  };

  render() {
    const { classes, openedVideo, handleClose, open, modelTab } = this.props;
    const {
      isLoaded,
      videoStatus,
      videoMetadata,
      descriptionOpen,
      summary
    } = this.state;
    if (!isLoaded) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
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
      goodvideo
    } = videoMetadata;

    return (
      <Dialog
        onClose={this.update}
        open={open}
        aria-labelledby="form-dialog-title"
      >
        <div className={classes.dialogStyle}>
          <DialogTitle id="form-dialog-title">
            <Typography>Video {openedVideo.id + ': ' + filename}</Typography>
          </DialogTitle>
          <DialogContent>
            <Typography>Users Watching: {userswatching.join(', ')}</Typography>
            <Typography>GPS start: {`${gpsstart.x}, ${gpsstart.y}`}</Typography>
            <Typography>GPS stop: {`${gpsstop.x}, ${gpsstop.y}`}</Typography>
            <Typography>Start Depth: {startdepth}</Typography>
            <Typography>End Depth: {enddepth}</Typography>
            <Typography>Start Time: {starttime}</Typography>
            <Typography>End Time: {endtime}</Typography>

            <Input
              onKeyPress={this.handleKeyPress}
              className={classes.descriptionInput}
              autoFocus
              id="concept"
              type="text"
              defaultValue={description}
              placeholder="Description"
              multiline
              disabled={modelTab}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={goodvideo}
                  onChange={() => {
                    let deepMetaData = JSON.parse(
                      JSON.stringify(videoMetadata)
                    );
                    deepMetaData.goodvideo = !goodvideo;
                    console.log(deepMetaData);

                    this.setState({
                      videoMetadata: deepMetaData
                    });
                  }}
                  value="goodVideo"
                  color="secondary"
                />
              }
              label="Good Video"
            />
          </DialogContent>
          <Radio
            checked={videoStatus === 'unwatched'}
            onChange={this.handleVideoStatusChange}
            value="unwatched"
            color="default"
            disabled={modelTab}
          />
          Unwatched
          <Radio
            checked={videoStatus === 'annotated'}
            onChange={this.handleVideoStatusChange}
            value="annotated"
            color="default"
            disabled={modelTab}
          />
          Annotated
          <Radio
            checked={videoStatus === 'inProgress'}
            onChange={this.handleVideoStatusChange}
            value="inProgress"
            color="default"
            disabled={modelTab}
          />
          In Progress
          <DialogActions>
            <Button
              onClick={event => this.openVideoSummary(event)}
              color="primary"
            >
              Summary
            </Button>
            <Button onClick={handleClose} color="primary">
              Cancel
            </Button>
            <Button onClick={this.update} color="primary" disabled={modelTab}>
              Update
            </Button>
          </DialogActions>
          {descriptionOpen && (
            <Summary
              open
              handleClose={this.closeVideoSummary}
              gpsstart={gpsstart}
              gpsstop={gpsstop}
              startdepth={startdepth}
              enddepth={enddepth}
              summary={summary}
            />
          )}
        </div>
      </Dialog>
    );
  }
}

export default withStyles(styles)(VideoMetadata);

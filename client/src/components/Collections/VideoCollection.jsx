import React, { Component } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Slider from '@material-ui/core/Slider';
import Swal from 'sweetalert2/src/sweetalert2';
import Hotkeys from 'react-hot-keys';
import Grid from '@material-ui/core/Grid';

import VideoList from '../Utilities/VideoList';
import CollectionList from './CollectionVideoList';
import Annotate from '../Annotate';

const styles = theme => ({
  videoContainer: {
    top: '50px',
    width: '1920px',
    height: '1080px'
  },
  dragBox: {
    margin: '0px',
    backgroundColor: 'transparent',
    border: '2px coral solid',
    borderStyle: 'ridge'
  },
  button: {
    marginTop: '10px',
    marginLeft: '20px',
    marginBottom: '10px'
  },
  videoName: {
    marginTop: theme.spacing(1.5)
  }
});

class videoCollection extends Component {
  constructor(props) {
    super(props);

    // here we do a manual conditional proxy because React won't do it for us
    let socket;
    if (window.location.origin === 'http://localhost:3000') {
      console.log('manually proxying socket');
      socket = io('http://localhost:3001');
    } else {
      socket = io();
    }
    // const socket = io({transports: ['polling, websocket']});

    socket.on('connect', () => {
      console.log('socket connected!');
    });
    socket.on('reconnect_attempt', attemptNumber => {
      console.log('reconnect attempt', attemptNumber);
    });
    socket.on('disconnect', reason => {
      console.log(reason);
    });
    socket.on('refresh videos', this.loadVideos);

    this.state = {
      currentVideo: null,
      isLoaded: false,
      startedVideos: [],
      unwatchedVideos: [],
      watchedVideos: [],
      inProgressVideos: [],
      videoPlaybackRate: 1.0,
      error: null,
      socket
    };
  }

  componentDidMount = async () => {
    // add event listener for closing or reloading window
    window.addEventListener('beforeunload', this.handleUnload);

    this.handleUnload = Annotate.handleUnload;
    this.skipVideoTime = Annotate.skipVideoTime;
    this.playPause = Annotate.playPause;
    this.toggleVideoControls = Annotate.toggleVideoControls;

    try {
      this.loadVideos(this.getCurrentVideo);
      this.setState({
        collections: await this.loadCollections()
      });
    } catch (error) {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      const errMsg =
        error.response.data.detail || error.response.data.message || 'Error';
      console.log(errMsg);
      this.setState({
        isLoaded: true,
        error: errMsg
      });
    }
  };

  componentWillUnmount = () => {
    const { socket } = this.state;
    this.updateCheckpoint(false, false);
    socket.disconnect();
    window.removeEventListener('beforeunload', this.handleUnload);
  };

  handleKeyDown = (keyName, e) => {
    e.preventDefault();
    switch (keyName) {
      case 'space':
        Annotate.playPause();
        break;
      case 'right':
        Annotate.skipVideoTime(1);
        break;
      case 'left':
        Annotate.skipVideoTime(-1);
        break;
      default:
    }
  };

  handleChangeSpeed = (event, value) => {
    const { videoPlaybackRate } = this.state;
    this.setState(
      {
        videoPlaybackRate: Math.round(value * 10) / 10
      },
      () => {
        const videoElement = document.getElementById('video');
        videoElement.playbackRate = videoPlaybackRate;
      }
    );
  };

  loadCollections = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    try {
      const collections = await axios.get('/api/collections/videos', config);
      if (collections) {
        return collections.data;
      }
    } catch (error) {
      console.log(error);
      Swal.fire('Error Getting Collection', '', 'error');
      return error;
    }
    return false;
  };

  loadVideos = callback => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios.get('/api/videos', config).then(res => {
      this.setState(
        {
          startedVideos: res.data.startedVideos,
          unwatchedVideos: res.data.unwatchedVideos,
          watchedVideos: res.data.watchedVideos,
          inProgressVideos: res.data.inProgressVideos
        },
        callback
      );
    });
  };

  deleteVideoCollection = async id => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async result => {
      if (result.value) {
        try {
          const response = await axios.delete(
            `/api/collections/videos/${id}`,
            config
          );
          if (response.status === 200) {
            Swal.fire('Deleted!', 'Collection has been deleted.', 'success');
            this.setState({
              collections: await this.loadCollections()
            });
          }
        } catch (error) {
          Swal.fire(error, '', 'error');
        }
      }
    });
  };

  getCurrentVideo = () => {
    const { startedVideos, unwatchedVideos } = this.state;
    // if user does not have a video to be played, return default video 1
    let currentVideo = {
      id: 1,
      filename: 'DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4',
      timeinvideo: 0,
      finished: true
    };
    if (startedVideos.length > 0) {
      // currentVideo is the first item in startedVideos
      [currentVideo] = startedVideos;
    } else if (unwatchedVideos.length > 0) {
      // currentVideo is the first item in unwatchedVideos
      [currentVideo] = unwatchedVideos;
    }
    this.setState(
      {
        currentVideo,
        isLoaded: true
      },
      () => {
        ({ currentVideo } = this.state);
        const videoElement = document.getElementById('video');
        videoElement.currentTime = currentVideo.timeinvideo;
        this.updateCheckpoint(false, true);
      }
    );
  };

  updateCheckpoint = (doneClicked, reloadVideos) => {
    const { currentVideo } = this.state;
    /*
      when the checkpoint for a video is updated, there are three places that
      need to reflect this: this.state.currentVideo, the videos list, and the 
      checkpoints table in the SQL database. Upon successful resolution of the 
      SQL database update, we reload the videos list by calling this.loadVideos,
      and if the done button was clicked, we reload this.state.currentVideo.
    */
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const videoElement = document.getElementById('video');
    const body = {
      timeinvideo: videoElement.currentTime,
      finished: doneClicked || currentVideo.finished
    };
    // update SQL database
    return axios
      .put(`/api/videos/checkpoints/${currentVideo.id}`, body, config)
      .then(() => {
        if (reloadVideos) {
          this.loadVideos(doneClicked ? this.getCurrentVideo : null);
        }
      })
      .catch(error => {
        console.log('Error in put api/videos/checkpoints');
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
        if (!error.response) {
          return;
        }
        const errMsg =
          error.response.data.detail || error.response.data.message || 'Error';
        console.log(errMsg);
        this.setState({
          error: errMsg
        });
      });
  };

  handleDoneClick = async () => {
    const { socket } = this.state;
    // update video checkpoint to watched
    await this.updateCheckpoint(true, true);
    socket.emit('refresh videos');
  };

  handleVideoClick = async clickedVideo => {
    const { socket, currentVideo } = this.state;
    await this.updateCheckpoint(false, true);
    this.setState(
      {
        currentVideo: clickedVideo
      },
      async () => {
        const videoElement = document.getElementById('video');
        videoElement.currentTime = currentVideo.timeinvideo;
        await this.updateCheckpoint(false, true);
        socket.emit('refresh videos');
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
      confirmButtonText: 'Next',
      showCancelButton: true,
      progressSteps: ['1', '2']
    })
      .queue([
        {
          title: 'Collection Name',
          input: 'text'
        },
        {
          title: 'Description',
          input: 'textarea'
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
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          };
          try {
            await axios.post('/api/collections/videos', body, config);
            Swal.fire({
              title: 'Collection Created!',
              confirmButtonText: 'Lovely!'
            });
            this.setState({
              collections: await this.loadCollections()
            });
          } catch (error) {
            Swal.fire('Error Creating Collection', '', 'error');
          }
        }
      });
  };

  insertVideosToCollection = (id, list) => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      videos: list
    };
    try {
      axios
        .post(`/api/collections/videos/${id}`, body, config)
        .then(() => {
          this.toggleDrawer();
          Swal.fire({
            title: 'Inserted!',
            confirmButtonText: 'Lovely!'
          });
        })
        .catch(() => {
          Swal.fire('Could not insert', '', 'error');
        });
    } catch (error) {
      Swal.fire('Error inserting video', '', 'error');
    }
  };

  toggleDrawer = () => {
    this.setState(prevState => ({
      drawerOpen: !prevState.drawerOpen
    }));
  };

  toggle = list => {
    this.setState(prevState => ({
      [list]: !prevState[list]
    }));
  };

  render() {
    const { classes } = this.props;
    const { isLoaded, error } = this.state;

    if (!isLoaded) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    if (error) {
      return <Typography style={{ margin: '20px' }}>Error: {error}</Typography>;
    }
    const {
      socket,
      currentVideo,
      startedVideos,
      unwatchedVideos,
      watchedVideos,
      inProgressVideos,
      videoPlaybackRate,
      collections
    } = this.state;
    return (
      <>
        <Hotkeys keyName="space, right, left" onKeyDown={this.handleKeyDown} />
        <Grid container spacing={0}>
          <Grid item xs>
            <VideoList
              createCollection={this.createCollection}
              handleVideoClick={this.handleVideoClick}
              startedVideos={startedVideos}
              unwatchedVideos={unwatchedVideos}
              watchedVideos={watchedVideos}
              inProgressVideos={inProgressVideos}
              socket={socket}
              loadVideos={this.loadVideos}
              /* these are props for collection component only */
              collection
              insertToCollection={this.insertVideosToCollection}
              data={collections}
            />
          </Grid>
          <Grid item xs={8}>
            <Typography
              className={classes.videoName}
              variant="h5"
              align="center"
            >
              {`${currentVideo.id} ${currentVideo.filename}`}
            </Typography>
          </Grid>
          <Grid item xs>
            <CollectionList
              collType="video"
              createCollection={this.createCollection}
              loadCollections={this.loadCollections}
              deleteCollection={this.deleteVideoCollection}
              insertToCollection={this.insertVideosToCollection}
              openedVideo={currentVideo}
            />
          </Grid>
        </Grid>
        <Grid container spacing={0}>
          <Grid item xs={1} />
          <Grid item xs>
            <div className={classes.videoContainer}>
              <video
                onPause={() => this.updateCheckpoint(false, true)}
                id="video"
                width="1920"
                height="1080"
                src={`https://cdn.deepseaannotations.com/videos/${currentVideo.filename}`}
                type="video/mp4"
                crossOrigin="use-credentials"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </Grid>
          <Grid item xs />
        </Grid>
        <Grid container className={classes.root} spacing={0}>
          <Grid item xs={1} />
          <Grid item xs={6}>
            <div
              style={{
                float: 'left'
              }}
            >
              <Slider
                style={{
                  width: 200
                }}
                value={videoPlaybackRate}
                min={0}
                max={4}
                step={0.1}
                onChange={this.handleChangeSpeed}
              />
              <Typography>Play Rate: {videoPlaybackRate}</Typography>
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
              style={{ float: 'right' }}
              onClick={() => this.handleDoneClick()}
            >
              Done
            </Button>
          </Grid>
          <Grid item xs />
        </Grid>
      </>
    );
  }
}

export default withStyles(styles)(videoCollection);

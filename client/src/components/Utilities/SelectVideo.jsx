import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Checkbox from '@material-ui/core/Checkbox';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import { Grid, Typography } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Description from '@material-ui/icons/Description';

import VideoMetadata from './VideoMetadata';

const styles = theme => ({
  collection: {
    textTransform: 'none'
  },
  formControl: {
    marginTop: theme.spacing(1.5),
    maxHeight: '300px',
    overflow: 'auto'
  },
  group: {
    marginLeft: 15
  },
  button: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing()
  },
  list: {
    marginTop: theme.spacing(2),
    overflow: 'auto',
    maxHeight: `${280 + theme.spacing(4)}px`
  }
});

class SelectVideo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      videos: [],
      oriVideos: [],
      videoCollections: [],
      loaded: false,
      goodVideosOnly: false
    };
  }

  componentDidMount = async () => {
    const { getVideos, getVideoCollections } = this.props;

    const videos = await getVideos();
    const videoCollections = await getVideoCollections();

    this.setState({
      videos,
      videoCollections,
      loaded: true,
      openedVideo: null
    });
  };

  loadVideoList = () => {
    const { value } = this.props;
    const { loaded, videos } = this.state;

    if (!loaded)
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;

    if (videos.length === 0)
      return <Typography>No videos for current selection</Typography>;

    return videos.map(video => (
      <div key={video.id}>
        <IconButton onClick={event => this.openVideoMetadata(event, video)}>
          <Description />
        </IconButton>
        <FormControlLabel
          value={video.id.toString()}
          control={<Checkbox color="secondary" />}
          label={`${video.id} ${video.filename}`}
          checked={value.includes(video.id.toString())}
        ></FormControlLabel>
      </div>
    ));
  };

  // Methods for video meta data
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

  filterVideos = () => {
    const { videos, goodVideosOnly, oriVideos } = this.state;
    if (!goodVideosOnly) {
      this.setState({
        videos: videos.filter(video => video.goodvideo),
        oriVideos: videos,
        goodVideosOnly: true
      });
    } else {
      this.setState({
        videos: oriVideos,
        goodVideosOnly: false
      });
    }
  };

  render() {
    const {
      classes,
      value,
      handleChange,
      handleSelectAll,
      handleUnselectAll,
      handleChangeList
    } = this.props;
    const {
      videos,
      videoCollections,
      openedVideo,
      goodVideosOnly
    } = this.state;

    return (
      <Grid container spacing={5}>
        <Grid item>
          <Grid container spacing={2} alignItems="baseline">
            <Grid item>
              <Typography>Select videos</Typography>
            </Grid>
            <Grid item>
              <FormControlLabel
                value={goodVideosOnly}
                control={<Checkbox color="secondary" />}
                label={`Good Videos Only`}
                onChange={this.filterVideos}
              ></FormControlLabel>
            </Grid>
          </Grid>
          <div>
            <Button
              className={classes.button}
              color="secondary"
              onClick={() => {
                handleSelectAll(videos, value, 'selectedVideos');
              }}
            >
              Select All
            </Button>
            <Button
              className={classes.button}
              color="secondary"
              onClick={() => {
                handleUnselectAll('selectedVideos');
              }}
            >
              Unselect All
            </Button>
          </div>
          <FormControl className={classes.formControl}>
            <FormGroup
              className={classes.group}
              value={value}
              onChange={handleChangeList}
            >
              {this.loadVideoList()}
            </FormGroup>
          </FormControl>
        </Grid>
        <Grid item>
          <Typography>Select video collection</Typography>
          <List className={classes.list}>
            {videoCollections.map(videoCollection => (
              <ListItem key={videoCollection.id}>
                <Tooltip
                  title={
                    !videoCollection.description
                      ? ''
                      : videoCollection.description
                  }
                  placement="bottom-start"
                >
                  <div>
                    <Button
                      className={classes.collection}
                      variant="contained"
                      color="primary"
                      value={videoCollection.id.toString()}
                      disabled={!videoCollection.videoids[0]}
                      onClick={() => {
                        if (videoCollection.videoids[0]) {
                          const videoids = [];
                          videos.forEach(video => {
                            if (videoCollection.videoids.includes(video.id)) {
                              videoids.push(video.id.toString());
                            }
                          });
                          handleChange(videoids);
                        }
                      }}
                    >
                      {videoCollection.name +
                        (!videoCollection.videoids[0] ? ' (No Videos)' : '')}
                    </Button>
                  </div>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Grid>
        {openedVideo && (
          <VideoMetadata
            open
            handleClose={this.closeVideoMetadata}
            openedVideo={openedVideo}
            model={false}
          />
        )}
      </Grid>
    );
  }
}

export default withStyles(styles)(SelectVideo);

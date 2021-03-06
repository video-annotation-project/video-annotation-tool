import React, { Component } from 'react';
import axios from 'axios';
import Button from '@material-ui/core/Button';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import Description from '@material-ui/icons/Description';
import Swal from 'sweetalert2/src/sweetalert2';
import { ChevronLeft } from '@material-ui/icons';
import Grid from '@material-ui/core/Grid';

import Summary from '../Utilities/Summary';

const styles = theme => ({
  drawer: {
    width: '550px',
    overflow: 'auto'
  },
  toggleButton: {
    margin: theme.spacing()
  },
  retractDrawerButton: {
    margin: theme.spacing()
  }
});

class AIvideoList extends Component {
  constructor(props) {
    super(props);
    const { loadVideos, handleVideoClick } = this.props;
    this.state = {
      descriptionOpen: false,
      summary: null,
      metrics: null
    };

    this.loadVideos = loadVideos;
    this.handleVideoClick = handleVideoClick;
  }

  toggle = list => {
    this.setState(prevState => ({
      [list]: !prevState[list]
    }));
  };

  deleteAiVideo = async video => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: {
        video
      }
    };
    this.toggle('videoListOpen');
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
          await axios.delete('/api/videos/aivideos', config);
          Swal.fire('Deleted!', 'Video has been deleted.', 'success');
          this.loadVideos();
        } catch (error) {
          Swal.fire(error, '', 'error');
        }
      }
    });
  };

  openVideoSummary = async (event, video) => {
    event.stopPropagation();

    this.setState({
      descriptionOpen: true,
      metrics: await this.getMetrics(video)
    });
  };

  closeVideoSummary = () => {
    this.setState({
      descriptionOpen: false,
      metrics: null
    });
  };

  getMetrics = async video => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    let ret;
    try {
      const metrics = await axios.get(
        `/api/videos/aivideos/metrics?filename=${video.name}`,
        config
      );
      if (metrics) {
        ret = metrics.data;
      }
    } catch (error) {
      console.error('Error in summary.jsx get /api/videos/aivideos/metrics');
      console.error(error.response.data);
      ret = error.response;
    }
    return ret;
  };

  // // Methods for video meta data
  // openVideoMetadata = (event, video) => {
  //   event.stopPropagation();
  //   this.setState({
  //     openedVideo: video
  //   });
  // };

  // closeVideoMetadata = () => {
  //   this.setState({
  //     openedVideo: null
  //   });
  // };

  render() {
    const { classes, aiVideos } = this.props;
    const { videoListOpen, descriptionOpen, summary, metrics } = this.state;

    return (
      <div className={classes.root}>
        <Button
          className={classes.toggleButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggle('videoListOpen')}
        >
          Toggle Video List
        </Button>

        <Drawer
          anchor="left"
          open={videoListOpen}
          onClose={() => this.toggle('videoListOpen')}
        >
          <div className={classes.drawer}>
            <Grid container alignItems="flex-end" justify="space-between">
              <Grid item xs />
              <Grid
                item
                xs={1}
                style={{ float: 'right' }}
                className={classes.retractDrawerButton}
              >
                <IconButton
                  id="close-video-list"
                  onClick={() => this.toggle('videoListOpen')}
                >
                  <ChevronLeft />
                </IconButton>
              </Grid>
            </Grid>
            <List disablePadding>
              {aiVideos.map(video => (
                <ListItem
                  button
                  key={video.id}
                  onClick={() => this.handleVideoClick(video, 'aiVideos')}
                >
                  <ListItemText primary={`${video.id}. ${video.name}`} />
                  <IconButton
                    onClick={event => this.openVideoSummary(event, video)}
                  >
                    <Description />
                  </IconButton>
                  <IconButton
                    aria-label="Delete"
                    onClick={() => this.deleteAiVideo(video)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </div>
        </Drawer>
        {descriptionOpen && (
          <Summary
            open
            handleClose={this.closeVideoSummary}
            aiSummary
            metrics={metrics}
          />
        )}
      </div>
    );
  }
}

export default withStyles(styles)(AIvideoList);

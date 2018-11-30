import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
import axios from 'axios';
//import Divider from '@material-ui/core/Divider';

const styles = theme => ({
  root: {
    float: 'right',
    padding: '10px'
  },
  videos: {
    width: '400px',
    height: '1000px',
    padding: '15px',
    borderLeft: '1px black solid',
    overflow: 'auto'
  },
});

class VideoList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoListOpen: true,
      currentVideos: [],
      unwatchedVideos: [],
      watchedVideos: []
    };
  }

  componentDidMount = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    axios.get('/api/listVideos/', config).then(res => {
      this.setState({
        currentVideos: res.data[0].rows,
        unwatchedVideos: res.data[1].rows,
        watchedVideos: res.data[2].rows
      })
    })
  }

  toggleVideoList = () => {
    this.setState({
      videoListOpen: !this.state.videoListOpen
    });
  }

  handleVideoClick = (video, videoList) => {
    this.props.handleVideoClick(video.filename);
  }

  render () {
    const { classes } = this.props;
    const { currentVideos, unwatchedVideos, watchedVideos } = this.state;
    return (
      <div className={classes.root}>
        <Button variant="contained" color="primary" onClick={this.toggleVideoList}>
          Toggle Video List
        </Button>
        <div className={classes.videos} style={{display: this.state.videoListOpen ? '' : 'none'}}>
          Current Videos
          <List component="nav">
            {currentVideos.map((video, index) => (
              <ListItem button key={video.id} onClick={() => this.handleVideoClick(video, currentVideos)}>
                <ListItemText primary={video.id + '. ' + video.filename} />
              </ListItem>
            ))}
          </List>
          Unwatched Videos
          <List component="nav">
            {unwatchedVideos.map((video, index) => (
              <ListItem button key={video.id} onClick={() => this.handleVideoClick(video, unwatchedVideos)}>
                <ListItemText primary={video.id + '. ' + video.filename} />
              </ListItem>
            ))}
          </List>
          Watched Videos
          <List component="nav">
            {watchedVideos.map((video, index) => (
              <ListItem button key={video.id} onClick={() => this.handleVideoClick(video, watchedVideos)}>
                <ListItemText primary={video.id + '. ' + video.filename} />
              </ListItem>
            ))}
          </List>
        </div>
      </div>
    );
  }
}

VideoList.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(VideoList);

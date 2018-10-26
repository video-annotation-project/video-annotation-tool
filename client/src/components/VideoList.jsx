import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
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
      videosListOpen: true,
      currentVideos: [],
      unwatchedVideos: [],
      watchedVideos: []
    };
  }

  componentDidMount = () => {
    // this can be optimized by combining all three fetch requests into one
    fetch('/api/userVideos/false', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    })
      .then(res => res.json())
      .then(res => {
        this.setState({
          currentVideos: res.rows
      })
    })
    fetch('/api/userUnwatchedVideos/', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    })
      .then(res => res.json())
      .then(res => {
        this.setState({
          unwatchedVideos: res.rows
      })
    })
    fetch('/api/userVideos/true', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    })
      .then(res => res.json())
      .then(res => {
        this.setState({
          watchedVideos: res.rows
      })
    })
  }

  toggleVideoList = () => {
    this.setState({
      videoListOpen: !this.state.videoListOpen
    });
  }

  handleVideoClick = (filename) => {
    this.props.handleVideoClick(filename);
  }

  render () {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Button variant="contained" color="primary" onClick={this.toggleVideoList}>
          Toggle Video List
        </Button>
        <div className={classes.videos} style={{display: this.state.videoListOpen ? '' : 'none'}}>
          Current Videos
          <List component="nav">
            {this.state.currentVideos.map((video, index) => (
              <ListItem button key={video.id} onClick={() => this.handleVideoClick(video.filename)}>
                <ListItemText primary={video.id + '. ' + video.filename} />
              </ListItem>
            ))}
          </List>
          Unwatched Videos
          <List component="nav">
            {this.state.unwatchedVideos.map((video, index) => (
              <ListItem button key={video.id} onClick={() => this.handleVideoClick(video.filename)}>
                <ListItemText primary={video.id + '. ' + video.filename} />
              </ListItem>
            ))}
          </List>
          Watched Videos
          <List component="nav">
            {this.state.watchedVideos.map((video, index) => (
              <ListItem button key={video.id} onClick={() => this.handleVideoClick(video.filename)}>
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

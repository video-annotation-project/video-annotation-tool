import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import axios from 'axios';

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
      currentListOpen: false,
      unwatchedListOpen: false,
      watchedListOpen: false,
      currentVideos: [],
      unwatchedVideos: [],
      watchedVideos: []
    };
  }

  // Is it possible to combine all three get requests into one?
  componentDidMount = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    if (this.props.videoDone) {
      let videoList = JSON.parse(JSON.stringify(this.state.currentVideos));
      videoList = videoList.filter(vid => vid.id !== this.props.videoDone.id);
      this.setState({
        currentVideos: videoList,
        watchedVideos: this.state.watchedVideos.concat([this.props.videoDone])
      })
    } else {
      axios.get('/api/listVideos/', config).then(res => {
        this.setState({
          currentVideos: res.data[0].rows,
          unwatchedVideos: res.data[1].rows,
          watchedVideos: res.data[2].rows
        })
      })
    }
  }

  toggleVideoList = () => {
    this.setState({
      videoListOpen: !this.state.videoListOpen
    });
  }

  handleVideoClick = (video, videoListName) => {
    let videoList = JSON.parse(JSON.stringify(this.state[videoListName]));
    videoList = videoList.filter(vid => vid.id !== video.id);
    this.setState({
      currentVideos: this.state.currentVideos.concat([video]),
      [videoListName]: videoList
    })
    this.props.handleVideoClick(video);
  }
  handleCurrentClick = () => {
    this.setState(state => ({ currentListOpen: !state.currentListOpen }));
  }
  handleUnwatchedClick = () => {
    this.setState(state => ({ unwatchedListOpen: !state.unwatchedListOpen }));
  }
  handleWatchedClick = () => {
    this.setState(state => ({ watchedListOpen: !state.watchedListOpen }));
  }

  render () {
    const { classes } = this.props;
    const {
      currentVideos,
      unwatchedVideos,
      watchedVideos,
      currentListOpen,
      unwatchedListOpen,
      watchedListOpen
    } = this.state;
    return (
      <div className={classes.root}>
        <Button variant="contained" color="primary" onClick={this.toggleVideoList}>
          Toggle Video List
        </Button>
        <div className={classes.videos} style={{display: this.state.videoListOpen ? '' : 'none'}}>
          <ListItem button onClick={this.handleCurrentClick}>
            <ListItemText inset primary="Current Videos" />
            {currentListOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={currentListOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {currentVideos.map((video, index) => (
                <ListItem button key={video.id} onClick={() => this.handleVideoClick(video, 'currentVideos')}>
                  <ListItemText primary={video.id + '. ' + video.filename} />
                </ListItem>
              ))}
            </List>
          </Collapse>

          <ListItem button onClick={this.handleUnwatchedClick}>
            <ListItemText inset primary="Unwatched Videos" />
            {unwatchedListOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={unwatchedListOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {unwatchedVideos.map((video, index) => (
                <ListItem button key={video.id} onClick={() => this.handleVideoClick(video, 'unwatchedVideos')}>
                  <ListItemText primary={video.id + '. ' + video.filename} />
                </ListItem>
              ))}
            </List>
          </Collapse>

          <ListItem button onClick={this.handleWatchedClick}>
            <ListItemText inset primary="Watched Videos" />
            {watchedListOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={watchedListOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {watchedVideos.map((video, index) => (
                <ListItem button key={video.id} onClick={() => this.handleVideoClick(video, 'watchedVideos')}>
                  <ListItemText primary={video.id + '. ' + video.filename} />
                </ListItem>
              ))}
            </List>
          </Collapse>

        </div>
      </div>
    );
  }
}

VideoList.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(VideoList);

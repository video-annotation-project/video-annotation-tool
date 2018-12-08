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

  handleVideoClick = (video, videoListName) => {
    /*
    If click unwatched remove from unwatchced and placed in current
    If current clicked stay there unless complete then remove and add to watchedVideos
    If video in watched is clicked then it should stay there
    */
    let videoList = JSON.parse(JSON.stringify(this.state[videoListName]));
    if (videoListName === 'unwatchedVideos') {
      videoList = videoList.filter(vid => vid.id !== video.id);
      this.setState({
        [videoListName]: videoList
      })
    }
    let currentVideosList = JSON.parse(JSON.stringify(this.state.currentVideos));
    let videoInCurrent = currentVideosList.find(vid => vid.id === video.id);
    if (videoInCurrent === undefined) {
      currentVideosList = currentVideosList.concat([video]);
      this.setState({
        currentVideos: currentVideosList
      })
    }

    this.props.handleVideoClick(video);
  }
  handleListClick = (list) => {
    this.setState(state => ({ [list]: !state[list] }));
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
          <ListItem button onClick={() => this.handleListClick("currentVideos"}>
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

          <ListItem button onClick={() => this.handleListClick("unwatchedVideos"}>
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

          <ListItem button onClick={() => this.handleListClick("watchedListOpen"}>
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

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
    axios.all([
        axios.get('/api/userVideos/false', {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
        }),
        axios.get('/api/userUnwatchedVideos/', {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
        }),
        axios.get('/api/userVideos/true', {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
        })
      ])
      .then(axios.spread( (currentResp, unwatchedResp, watchedResp) => {
        this.setState({
          currentVideos : currentResp.data.rows,
          unwatchedVideos : unwatchedResp.data.rows,
          watchedVideos : watchedResp.data.rows
        })
      }));
  }

  toggleVideoList = () => {
    this.setState({
      videoListOpen: !this.state.videoListOpen
    });
  }

  handleVideoClick = (filename) => {
    this.props.handleVideoClick(filename);
  }

  handleListClick = (list) => {
    this.setState(state => ({ [list]: !state[list] }));
  }

  render () {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Button variant="contained" color="primary" onClick={this.toggleVideoList}>
          Toggle Video List
        </Button>
        <div className={classes.videos} style={{display: this.state.videoListOpen ? '' : 'none'}}>

          <ListItem button onClick={() => this.handleListClick("currentListOpen")}>
            <ListItemText inset primary="Current Videos" />
            {this.state.currentListOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={this.state.currentListOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {this.state.currentVideos.map((video, index) => (
                <ListItem button key={video.id} onClick={() => this.handleVideoClick(video.filename)}>
                  <ListItemText primary={video.id + '. ' + video.filename} />
                </ListItem>
              ))}
            </List>
          </Collapse>

          <ListItem button onClick={() => this.handleListClick("unwatchedListOpen")}>
            <ListItemText inset primary="Unwatched Videos" />
            {this.state.unwatchedListOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={this.state.unwatchedListOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {this.state.unwatchedVideos.map((video, index) => (
                <ListItem button key={video.id} onClick={() => this.handleVideoClick(video.filename)}>
                  <ListItemText primary={video.id + '. ' + video.filename} />
                </ListItem>
              ))}
            </List>
          </Collapse>

          <ListItem button onClick={() => this.handleListClick("watchedListOpen")}>
            <ListItemText inset primary="Watched Videos" />
            {this.state.watchedListOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={this.state.watchedListOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {this.state.watchedVideos.map((video, index) => (
                <ListItem button key={video.id} onClick={() => this.handleVideoClick(video.filename)}>
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

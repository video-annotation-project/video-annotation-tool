import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import axios from 'axios';
import Annotations from './Annotations.jsx';
//import Divider from '@material-ui/core/Divider';

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,

  },

});

class VideosAnnotated extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videos: [],
      isLoaded: false,
      error: null
    };
  }

  getVideosWatched = async () => {
    let videos = await axios.get(`/api/videosWatched`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    })
    return videos.data;

  };

  makeObject = async (videos) => {
    let tempList = []

    videos.forEach(video => {
      let temp = {}
      temp['id'] = video.id;
      temp['filename'] = video.filename;
      temp['expanded'] = false;
      tempList.push(temp);
    })
    return tempList;
  }

  componentDidMount = async () => {
      let videos = await this.getVideosWatched();
      videos = await this.makeObject(videos);
      await this.setState({
        isLoaded: true,
        videos: videos
      });


  };

  /*
  <ListItem button>
    <ListItemText primary="Inbox" />
  </ListItem>
  <ListItem button>
    <ListItemText primary="Drafts" />
  </ListItem>
  */

  handleVideoClick = async (filename) => {
    let videos = this.state.videos;
    for (let video of videos) {
      if (video.filename === filename) {
        video.expanded = !video.expanded;
      }
    }
    await this.setState({
      videos: videos
    })
  }

  render () {
    const { error, isLoaded, videos } = this.state;
    const { classes } = this.props;

    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
    <List className={classes.root}>
      {videos.map((video, index) =>(
        <React.Fragment key={index+1}>
          <ListItem button onClick={() => this.handleVideoClick(video.filename)}>
            <ListItemText primary={(index+1)+': '+video.filename} />
            {video.expanded ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={video.expanded} timeout='auto' >
              <Annotations videoId = {video.id} />
          </Collapse>
        </React.Fragment>
      ))}
      </List>
    );
  }

}

VideosAnnotated.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(VideosAnnotated);

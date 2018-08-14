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
      videosList: [],
      isLoaded: false,
      error: null
    };
  }

  getVideosWatched = async () => {
    await axios.get(`/api/videosWatched`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => (res.data))
      .catch(error => {
      this.setState({
        isloaded: true,
        error: error
      });
      return;
    })
  };

  makeObject = async (videos) => {
    let tempList = []
    videos.forEach(video => {
      let temp = {}
      temp['filename'] = video;
      temp['expanded'] = false;
      tempList.push(temp);
    })
    return tempList;
  }

  testing = async (videos) => {
    await console.log(videos);
  }

  componentDidMount = async () => {
      let videos = await this.getVideosWatched();
      await this.testing(videos);
  };

  /*
  <ListItem button>
    <ListItemText primary="Inbox" />
  </ListItem>
  <ListItem button>
    <ListItemText primary="Drafts" />
  </ListItem>


  */
  handleVideoClick = () => {

  }

  render () {
    const { error, isLoaded, videosList } = this.state;
    const { classes } = this.props;

    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
    <List className={classes.root}>
      {videosList.map((video, index) =>(
        <React.Fragment key={index+1}>
          <ListItem button onClick={this.handleVideoClick()}>
            <ListItemText primary={(index+1)+': '+video.filename} />
            {video.expanded ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={video.expanded} timeout='auto' >
            test
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

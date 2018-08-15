import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import axios from 'axios';

//import Divider from '@material-ui/core/Divider';

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,

  },
});

class AnnotationFrame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      image: null,
      isLoaded: false,
      error: null,
    };
  }

  getVideoImage = (path, secs, callback) => {
    var me = this;
    var video = document.createElement('video');
    video.setAttribute('crossOrigin', 'use-credentials');
    video.onloadedmetadata = function() {
      // this.currentTime = Math.min(Math.max(0, (secs < 0 ? this.duration : 0) + secs), this.duration);
      this.currentTime = secs;
    };
    video.onseeked = function(e) {
      var canvas = document.createElement('canvas');
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var img = new Image();
      img.setAttribute('crossOrigin', 'use-credentials');
      img.src = canvas.toDataURL();
      callback.call(me, img, this.currentTime, e);
    };
    video.onerror = function(e) {
      callback.call(me, undefined, undefined, e);
    };
    video.src = path;
  }

  componentDidMount = async () => {
    this.getVideoImage('https://d1yenv1ac8fa55.cloudfront.net/videos/'+this.props.annotation.filename,
     this.props.annotation.timeinvideo,
    function(img, secs, event) {
      if (event.type === 'seeked') {
        this.setState({
          isLoaded: true,
          image: img
        })
      }
    });
  };

  render () {
    const { error, isLoaded, AnnotationFrame } = this.state;
    const { classes } = this.props;

    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
      <React.Fragment>
        <List className={classes.root}>
            <ListItem>
              <img src={this.state.image.src} />
            </ListItem>
        </List>
      </React.Fragment>
    );
  }

}

AnnotationFrame.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(AnnotationFrame);

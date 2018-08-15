import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import axios from 'axios';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import AnnotationFrame from './AnnotationFrame.jsx';

//import Divider from '@material-ui/core/Divider';

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,

  },
});

function getVideoImage(path, secs, callback) {
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

class Annotations extends Component {
  constructor(props) {
    super(props);
    this.state = {
      annotations: [],
      isLoaded: false,
      error: null,
    };
  }

  getAnnotations = async (id) => {
    let annotations = await axios.get(`/api/getAnnotations?videoid=${id}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    })
    return annotations.data;

  };

  componentDidMount = async () => {
      let annotations = await this.getAnnotations(this.props.videoId);
      annotations.forEach(annotation => {
        annotation.expanded = false;
      })
      await this.setState({
        isLoaded: true,
        annotations: annotations
      });
  };

  handleClick = async (time, filename, id) => {
    let annotations = this.state.annotations;
    for (let annotation of annotations) {
      if (annotation.id === id) {
        annotation.expanded = !annotation.expanded;
      }
    }
    await this.setState({
      annotations: annotations
    })

  }

  render () {
    const { error, isLoaded, annotations } = this.state;
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
          {annotations.map((annotation, index) =>(
            <React.Fragment key={index+1}>
              <ListItem button onClick={() => this.handleClick(annotation.timeinvideo, annotation.filename, annotation.id)}>
                <ListItemText primary={'At '+ Math.floor(annotation.timeinvideo/60) + ' minutes '+ annotation.timeinvideo%60 + " seconds Annotated: " + annotation.name} />
                {annotation.expanded ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={annotation.expanded} timeout='auto' >
                <AnnotationFrame annotation={annotation} />
              </Collapse>
            </React.Fragment>
          ))}
        </List>
        <div id = 'olFrame'></div>
        </React.Fragment>
    );
  }

}

Annotations.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Annotations);

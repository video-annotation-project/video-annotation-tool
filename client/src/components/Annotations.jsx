import React, { Component } from 'react';
import axios from 'axios';

import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import DeleteIcon from '@material-ui/icons/Delete';
import OndemandVideo from '@material-ui/icons/OndemandVideo';
import Photo from '@material-ui/icons/Photo';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';

import AnnotationFrame from './AnnotationFrame.jsx';


const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
  icons: {
    float: 'left',
    position: 'relative',
    left: '-50px'
  },
  button: {
    margin: theme.spacing.unit
  },
});

class Annotations extends Component {
  constructor(props) {
    super(props);
    this.state = {
      annotations: [],
      isLoaded: false,
      error: null,
    };
  }

  getAnnotations = async () => {
    let port = `/api/annotations?level1=${this.props.level1}&id=${this.props.id}` +
               `&admin=${localStorage.getItem('admin')}&unsureOnly=${this.props.unsureOnly}`;
    if (this.props.level2) {
      port = port + `&level2=${this.props.level2}&level1Id=${this.props.level1Id}`;
    }
    if (this.props.level3) {
      port = port + `&level3=${this.props.level3}&level2Id=${this.props.level2Id}`;
    }
    let annotations = await axios.get(port, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    });
    return annotations.data;
  };

  componentDidMount = async () => {
    let annotations = await this.getAnnotations();
    annotations.map(annotation => annotation.expanded = false);
    this.setState({
      isLoaded: true,
      annotations: annotations,
    });
  };

  handleClick = async (time, filename, id) => {
    let annotations = JSON.parse(JSON.stringify(this.state.annotations));
    let annotation = annotations.find(annotation => annotation.id === id);
    annotation.expanded = !annotation.expanded;
    this.setState({
      annotations: annotations
    });
  }

  showVideo = async (event, id) => {  
    let annotations = this.state.annotations
    let annotation = annotations.find(annotation => annotation.id === id);
    if(annotation.showVideo){
      annotation.showVideo = false;
    }else{
      annotation.showVideo = true;
    }
    this.setState({
      annotations: annotations
    });
  }

  handleDelete = async (event, id) => {
    event.stopPropagation();
    fetch('/api/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({
        'id': id
      })
    }).then(res => res.json()).then(res => {
      let annotations = JSON.parse(JSON.stringify(this.state.annotations));
      annotations = annotations.filter(annotation => annotation.id !== id);
      this.setState({
        isLoaded: false,
        annotations: annotations
      });
      this.setState({
        isLoaded: true
      });
    });
  }

  reloadAnnotations = (id, updatedName, updatedComment, updatedUnsure) => {
    let annotations = JSON.parse(JSON.stringify(this.state.annotations));
    let annotation = annotations.find(annotation => annotation.id === id);
    annotation.name = updatedName;
    annotation.comment = updatedComment;
    annotation.unsure = updatedUnsure;
    this.setState({
      annotations: annotations
    });
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
          {annotations.map((annotation, index) => (
            <React.Fragment key={index}>
              <ListItem button
                 onClick={() => this.handleClick(
                   annotation.timeinvideo,
                   annotation.filename,
                   annotation.id
                   )
                 }
              >

                <ListItemText
                  primary={
                    'At '+ Math.floor(annotation.timeinvideo/60) +
                    ' minutes '+ annotation.timeinvideo%60 +
                    ' seconds Annotated: ' +
                    annotation.name
                  }
                  secondary={
                    (annotation.comment ?
                      "Annotation Comment: " + annotation.comment
                      :
                      ""
                    )
                  }
                />
                <ListItemSecondaryAction >
                  {annotation.unsure ? (
                      <Icon>help</Icon>
                  ):(
                    <div></div>
                  )}
                  <IconButton className={classes.icons} aria-label="OndemandVideo">
                  {annotation.showVideo ? (<Photo onClick = {(e) => this.showVideo(e, annotation.id)} />):
                (<OndemandVideo onClick = {(e) => this.showVideo(e, annotation.id)} />)}
                    
                  </IconButton>
                  <IconButton className={classes.icons} aria-label="Delete">
                    <DeleteIcon onClick = {(e) => this.handleDelete(e, annotation.id)} />
                  </IconButton>
                  {annotation.expanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemSecondaryAction>
              </ListItem>
              <Collapse in={annotation.expanded} timeout='auto' unmountOnExit>
                {annotation.showVideo ? (<video id="video"  width="800" height="450" src={'api/videos/Y7Ek6tndnA/Ventana-3881_20151028T173548Z_01-20-16-11TC_h264.mp4'} type='video/mp4' controls>
                  Your browser does not support the video tag.
                </video>):
                (<AnnotationFrame
                  annotation={annotation}
                  reloadAnnotations={this.reloadAnnotations}
                />)}
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </React.Fragment>
    );
  }
}

Annotations.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Annotations);

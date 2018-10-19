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
import DeleteIcon from '@material-ui/icons/Delete';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import IconButton from '@material-ui/core/IconButton';

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
  delete: {
    float: 'left',
    position: 'relative',
    left: '-50px'
  }
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
    let port = `/api/annotations?level1=${this.props.level1}&id=${this.props.id}&admin=${localStorage.getItem('admin')}`;
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
    this.props.setAnnotationCount(this.props.id, annotations.length);
    annotations.map(annotation => annotation.expanded = false);
    this.setState({
      isLoaded: true,
      annotations: annotations
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

  handleDelete = async (event, id) => {
    event.stopPropagation();
    fetch('/api/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json','Authorization': 'Bearer ' + localStorage.getItem('token')},
      body: JSON.stringify({
        'id': id
      })
    }).then(res => res.json()).then(res => {
      console.log(res);
      let annotations = JSON.parse(JSON.stringify(this.state.annotations));
      annotations = annotations.filter(annotation => annotation.id !== id);
      this.setState({
        annotations: annotations
      });
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
              <ListItem button onClick={() => this.handleClick(annotation.timeinvideo, annotation.filename, annotation.id)}>
                <ListItemText primary={'At '+ Math.floor(annotation.timeinvideo/60) + ' minutes '+ annotation.timeinvideo%60 + " seconds Annotated: " + annotation.name} />
                <ListItemSecondaryAction >
                  <IconButton className={classes.delete} aria-label="Delete">
                    <DeleteIcon onClick = {(e) => this.handleDelete(e, annotation.id)} />
                  </IconButton>
                </ListItemSecondaryAction>
                {annotation.expanded ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={annotation.expanded} timeout='auto' unmountOnExit>
                <AnnotationFrame annotation={annotation} />
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

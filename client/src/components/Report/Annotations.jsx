import React, { Component } from 'react';
import axios from 'axios';
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
import DoneAll from '@material-ui/icons/DoneAll';

import Swal from 'sweetalert2';
import AnnotationFrame from './AnnotationFrame';

const styles = theme => ({
  icons: {
    float: 'left',
    position: 'relative',
    left: '-50px'
  },
  button: {
    margin: theme.spacing()
  },
  root: {
    backgroundColor: theme.palette.background.paper,
    paddingLeft: theme.spacing(2)
  },
  listItem: {
    height: '57px'
  },
  helpIcon: {
    position: 'absolute',
    top: '12px',
    right: '40px'
  },
  doneIcon: {
    position: 'absolute',
    top: '12px',
    right: '175px'
  }
});

class Annotations extends Component {
  toastPopup = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });

  constructor(props) {
    super(props);
    this.state = {
      annotations: [],
      isLoaded: false,
      error: null
    };
  }

  componentDidMount() {
    this.loadAnnotations();
  }

  loadAnnotations = async () => {
    const {
      queryConditions,
      unsureOnly,
      verifiedCondition,
      queryLimit
    } = this.props;
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    try {
      const annotations = await axios.get(
        `/api/annotations?` +
          `queryConditions=${queryConditions}&` +
          `unsureOnly=${unsureOnly}&` +
          `verifiedCondition=${verifiedCondition}&` +
          `queryLimit=${queryLimit}`,
        config
      );
      this.setState({
        isLoaded: true,
        annotations: annotations.data
      });
    } catch (error) {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      const errMsg =
        error.response.data.detail || error.response.data.message || 'Error';
      console.log(errMsg);
      this.setState({
        isLoaded: true,
        error: errMsg
      });
    }
  };

  handleClick = id => {
    const { annotations } = this.state;
    const annotation = annotations.find(a => a.id === id);
    annotation.expanded = !annotation.expanded;
    this.setState({
      annotations
    });
  };

  toggleShowVideo = (event, id) => {
    const { annotations } = this.state;
    const annotation = annotations.find(a => a.id === id);
    if (!annotation.expanded) {
      annotation.expanded = true;
    }
    annotation.showVideo = !annotation.showVideo;
    this.setState({
      annotations
    });
  };

  handleDelete = (event, id) => {
    const { annotations } = this.state;
    event.stopPropagation();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: {
        id
      }
    };
    axios
      .delete('/api/annotations', config)
      .then(() => {
        this.toastPopup.fire({
          type: 'success',
          title: 'Annotation Deleted!!'
        });
        const filteredAnnotations = annotations.filter(
          annotation => annotation.id !== id
        );
        this.setState({
          annotations: filteredAnnotations
        });
      })
      .catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
        if (!error.response) {
          return;
        }
        const errMsg =
          error.response.data.detail || error.response.data.message || 'Error';
        console.log(errMsg);
        this.setState({
          isLoaded: true,
          error: errMsg
        });
      });
  };

  updateAnnotations = (id, updatedName, updatedComment, updatedUnsure) => {
    const { annotations } = this.state;
    const annotation = annotations.find(a => a.id === id);
    annotation.name = updatedName;
    annotation.comment = updatedComment;
    annotation.unsure = updatedUnsure;
    this.setState({
      annotations
    });
  };

  render() {
    const { error, isLoaded, annotations } = this.state;
    const { classes } = this.props;
    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error) {
      return <List>Error: {error.message}</List>;
    }
    return (
      <React.Fragment>
        <List disablePadding className={classes.root}>
          {annotations.map(annotation => (
            <React.Fragment key={annotation.id}>
              <ListItem
                className={classes.listItem}
                button
                onClick={() => this.handleClick(annotation.id)}
              >
                <ListItemText
                  primary={`At ${Math.floor(
                    annotation.timeinvideo / 60
                  )} minutes ${annotation.timeinvideo %
                    60} seconds Annotated: ${annotation.name}`}
                  secondary={
                    annotation.comment
                      ? `Annotation Comment: ${annotation.comment}`
                      : ''
                  }
                />

                <ListItemSecondaryAction>
                  {annotation.unsure ? (
                    <Icon className={classes.helpIcon}>help</Icon>
                  ) : (
                    <div />
                  )}
                  {annotation.verifiedby ? (
                    <DoneAll color="primary" className={classes.doneIcon} />
                  ) : (
                    <div />
                  )}
                  <IconButton
                    className={classes.icons}
                    aria-label="OndemandVideo"
                    onClick={e => this.toggleShowVideo(e, annotation.id)}
                  >
                    {annotation.showVideo ? <OndemandVideo /> : <Photo />}
                  </IconButton>
                  <IconButton
                    id="delete"
                    className={classes.icons}
                    aria-label="Delete"
                    onClick={e => this.handleDelete(e, annotation.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                  {annotation.expanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemSecondaryAction>
              </ListItem>

              <Collapse in={annotation.expanded} timeout="auto" unmountOnExit>
                {annotation.showVideo ? (
                  <video
                    id="video"
                    width="800"
                    height="450"
                    src={`https://cdn.deepseaannotations.com/videos/${annotation.id}_track.mp4`}
                    type="video/mp4"
                    controls
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <AnnotationFrame
                    annotation={annotation}
                    loadAnnotations={this.loadAnnotations}
                    updateAnnotations={this.updateAnnotations}
                  />
                )}
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(Annotations);

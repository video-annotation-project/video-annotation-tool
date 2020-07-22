import React, { Component } from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import ListItem from '@material-ui/core/ListItem';

import ConceptsSelected from '../Utilities/ConceptsSelected';
import DialogModal from '../Utilities/DialogModal';

const styles = () => ({
  item: {
    // display: 'inline',
    paddingTop: 0,
    width: '1300px',
    height: '730px',
    paddingLeft: 0
  },
  img: {
    width: '1280px',
    height: '720px'
  }
});

class AnnotationFrame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      dialogMsg: null,
      dialogOpen: false,
      clickedConcept: null
    };
  }

  editAnnotation = (comment, unsure) => {
    const { annotation, updateAnnotations } = this.props;
    const { clickedConcept } = this.state;

    const body = {
      op: 'verifyAnnotation',
      conceptId: clickedConcept.id,
      oldConceptId: annotation.conceptId,
      conceptName: clickedConcept.name,
      comment,
      unsure,
      id: annotation.id
    };
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .patch('/api/annotations', body, config)
      .then(() => {
        this.handleDialogClose();
        updateAnnotations(
          clickedConcept.id,
          clickedConcept.name,
          comment,
          unsure
        );
      })
      .catch(error => {
        this.handleDialogClose();
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  handleDialogClose = () => {
    const { loadAnnotations } = this.props;

    loadAnnotations();
    this.setState({
      dialogOpen: false,
      dialogMsg: null,
      clickedConcept: null
    });
  };

  handleConceptClick = concept => {
    const { annotation } = this.props;
    this.setState({
      dialogMsg: `Switch ${annotation.name} to ${concept.name}?`,
      dialogOpen: true,
      clickedConcept: concept
    });
  };

  render() {
    const { error, dialogMsg, dialogOpen } = this.state;
    const { classes, annotation } = this.props;
    const {
      unsure,
      comment,
      image,
      x1,
      y1,
      x2,
      y2,
      videoheight,
      videowidth
    } = annotation;

    if (error) {
      return <div>Error: {error}</div>;
    }
    return (
      <>
        <DialogModal
          title="Confirm Annotation Edit"
          message={dialogMsg}
          comment={comment}
          unsure={unsure}
          placeholder="Comments"
          inputHandler={this.editAnnotation}
          open={dialogOpen}
          handleClose={this.handleDialogClose}
        />
        <ConceptsSelected handleConceptClick={this.handleConceptClick} />
        <ListItem className={classes.item}>
          <div className={classes.img}>
            <div
              style={{
                position: 'relative',
                width: 0,
                height: 0,
                top: y1 * (720 / videoheight),
                left: x1 * (1280 / videowidth)
              }}
            >
              <div
                style={{
                  width: (x2 - x1) * (1280 / videowidth),
                  height: (y2 - y1) * (720 / videoheight),
                  border: '2px solid coral'
                }}
              ></div>
            </div>
            <img
              className={classes.img}
              id="imageId"
              src={`https://cdn.deepseaannotations.com/annotation_frames/${image}`}
              alt="error"
            />
          </div>
        </ListItem>
      </>
    );
  }
}

export default withStyles(styles)(AnnotationFrame);

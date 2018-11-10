import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import ListItem from '@material-ui/core/ListItem';
import AWS from 'aws-sdk';
import ConceptsSelected from './ConceptsSelected.jsx';
import DialogModal from './DialogModal.jsx';
import axios from 'axios';

AWS.config.update(
  {
    accessKeyId: "AKIAIJRSQPH2BGGCEFOA",
    secretAccessKey: "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",
    region: 'us-west-1',
  }
);

const styles = theme => ({
  item: {
    display: 'inline',
    paddingTop: 0,
    width: '1300px',
    height: '730px',
    paddingLeft: 0
  },
  img: {
    width: '1280px',
    height: '720px',
  }
});

class AnnotationFrame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      image: null,
      isLoaded: false,
      error: null,
      width: null,
      height: null,
      dialogTitle: null,
      dialogMsg: null,
      dialogPlaceholder: null,
      dialogOpen: false,
      clickedConcept: null,
      closeHandler: null,
      enterEnabled: true,
    };
  }
  encode = (data) => {
    var str = data.reduce(function(a,b) { return a+String.fromCharCode(b) },'');
    return btoa(str).replace(/.{76}(?=.)/g,'$&\n');
  }

  componentDidMount = async () => {
    fetch(`/api/annotationImage/${this.props.annotation.imagewithbox}`)
      .then(res => res.json())
      .then(res => {
        this.setState({
          image: 'data:image/png;base64, ' + this.encode(res.image.data),
          isLoaded: true
        });
      })
      .catch(error => {
        console.log("Error: " + error);
        this.setState({
          isLoaded: true
        });
      })
      .catch(error => {
        console.log(error);
        this.setState({
          isLoaded: true
        })
      });
  };

  postEditAnnotation = (comment, unsure) => {
    if (comment === "") {
      comment = this.props.annotation.comment;
    }
    const body = {
      'conceptId': this.state.clickedConcept.id,
      'comment': comment,
      'unsure': unsure,
      'id': this.props.annotation.id
    }
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.post('/api/editAnnotation', body, config).then(res => {
      this.handleDialogClose();
      let updatedAnnotation = res.data;
      this.props.reloadAnnotations(updatedAnnotation.id, updatedAnnotation.name);
    }).catch(error => {
      this.handleDialogClose();
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    })
  }

  handleDialogClose = () => {
    this.setState({
      enterEnabled: false,
      dialogOpen: false,
      dialogMsg: null,
      dialogPlaceholder: null,
      dialogTitle: "", //If set to null, raises a warning to the console
      clickedConcept: null,
    });
  }

  handleConceptClick = (concept) => {
    this.setState({
      dialogMsg:  "Switch " + this.props.annotation.name +
                   " to " + concept.name + "?",
      dialogOpen: true,
      dialogTitle: "Confirm Annotation Edit",
      dialogPlaceholder: "Comments",
      clickedConcept: concept,
      enterEnabled: true,
      closeHandler: this.handleDialogClose
    })
  }

  render () {
    const { error, isLoaded, image } = this.state;
    const { classes } = this.props;
    if (!isLoaded) {
      return <div>Loading...</div>;
    }
    if (error)  {
      return <div>Error: {error.message}</div>;
    }
    return (
      <React.Fragment>
        <DialogModal
          title={this.state.dialogTitle}
          message={this.state.dialogMsg}
          placeholder={this.state.dialogPlaceholder}
          inputHandler={this.postEditAnnotation}
          open={this.state.dialogOpen}
          handleClose={this.state.closeHandler}
          enterEnabled={this.state.enterEnabled}
        />
        <ListItem className={classes.item}>
          <div id='test'></div>
          <img className={classes.img} id='imageId' src={image} alt='error' />
        </ListItem>
        <ConceptsSelected
          handleConceptClick={this.handleConceptClick}
        />
      </React.Fragment>
    );
  }
}

AnnotationFrame.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(AnnotationFrame);

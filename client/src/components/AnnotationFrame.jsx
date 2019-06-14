import React, { Component } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import ListItem from "@material-ui/core/ListItem";
import ConceptsSelected from "./ConceptsSelected.jsx";
import DialogModal from "./DialogModal.jsx";
import axios from "axios";

const styles = theme => ({
  item: {
    display: "inline",
    paddingTop: 0,
    width: "1300px",
    height: "730px",
    paddingLeft: 0
  },
  img: {
    width: "1280px",
    height: "720px"
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
      dialogMsg: null,
      dialogOpen: false,
      clickedConcept: null,
      closeHandler: null
    };
  }

  editAnnotation = (comment, unsure) => {
    if (comment === "") {
      comment = this.props.annotation.comment;
    }
    const body = {
      conceptId: this.state.clickedConcept.id,
      comment: comment,
      unsure: unsure,
      id: this.props.annotation.id
    };
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .patch("/api/annotations", body, config)
      .then(res => {
        this.handleDialogClose();
        let updatedAnnotation = res.data;
        this.props.updateAnnotations(
          updatedAnnotation.id,
          updatedAnnotation.name,
          updatedAnnotation.comment,
          updatedAnnotation.unsure
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
    this.setState({
      dialogOpen: false,
      dialogMsg: null,
      clickedConcept: null
    });
  };

  handleConceptClick = concept => {
    this.setState({
      dialogMsg:
        "Switch " + this.props.annotation.name + " to " + concept.name + "?",
      dialogOpen: true,
      clickedConcept: concept,
      closeHandler: this.handleDialogClose
    });
  };

  render() {
    const { error } = this.state;
    const { classes } = this.props;
    if (error) {
      return <div>Error: {error}</div>;
    }
    return (
      <React.Fragment>
        <DialogModal
          title={"Confirm Annotation Edit"}
          message={this.state.dialogMsg}
          placeholder={"Comments"}
          inputHandler={this.editAnnotation}
          open={this.state.dialogOpen}
          handleClose={this.state.closeHandler}
        />
        <ConceptsSelected handleConceptClick={this.handleConceptClick} />
        <ListItem className={classes.item}>
          <img
            className={classes.img}
            id="imageId"
            src={
              "https://cdn.deepseaannotations.com/test/" +
              this.props.annotation.imagewithbox
            }
            alt="error"
          />
        </ListItem>
      </React.Fragment>
    );
  }
}

AnnotationFrame.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(AnnotationFrame);

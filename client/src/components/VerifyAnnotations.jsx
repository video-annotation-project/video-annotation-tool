import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { Typography } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import ConceptsSelected from "./ConceptsSelected.jsx";
import DialogModal from "./DialogModal";

const styles = theme => ({
  button: {
    margin: theme.spacing.unit
  },
  item: {
    display: "inline",
    paddingTop: 0,
    width: "1300px",
    height: "730px",
    paddingLeft: 0
  },
  img: {
    padding: theme.spacing.unit * 3,
    width: "1280px",
    height: "720px"
  },
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gridGap: `${theme.spacing.unit * 3}px`
  },
  paper: {
    padding: theme.spacing.unit
  }
});

class VerifyAnnotations extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentIndex: 0,
      error: null,
      dialogMsg: null,
      dialogOpen: false,
      clickedConcept: null,
      closeHandler: null
    };
  }

  verifyAnnotation = async () => {
    const body = {
      id: this.props.annotations[this.state.currentIndex].id
    };
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    return axios
      .patch(`/api/annotationsVerify/`, body, config)
      .then(res => {
        return res.data;
      })
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  nextAnnotation = () => {
    let nextIndex = this.state.currentIndex + 1;
    this.setState({
      currentIndex: nextIndex
    });
  };

  // Concepts Selected
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
        "Switch " +
        this.props.annotations[this.state.currentIndex] +
        " to " +
        concept.name +
        "?",
      dialogOpen: true,
      clickedConcept: concept,
      closeHandler: this.handleDialogClose
    });
  };

  render() {
    const { classes } = this.props;
    const annotation = this.props.annotations[this.state.currentIndex];

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
        {this.state.currentIndex < this.props.annotations.length ? (
          <React.Fragment>
            <Typography className={classes.paper} variant="title">
              {" "}
              Annotation {annotation.id}
            </Typography>
            <Typography className={classes.paper} variant="body2">
              {" "}
              Annotated by: {annotation.userid}, Video: {annotation.videoid},
              Concept: {annotation.name}
            </Typography>
            <Typography className={classes.paper} variant="body2">
              At {Math.floor(annotation.timeinvideo / 60)} minutes{" "}
              {Math.floor(annotation.timeinvideo % 60)} seconds
            </Typography>
            <ConceptsSelected handleConceptClick={this.handleConceptClick} />
            {!annotation.image ? (
              <Typography className={classes.paper}>No Image</Typography>
            ) : (
              <img
                className={classes.img}
                src={`/api/annotationImages/${annotation.id}?withBox=true`}
                alt="error"
              />
            )}
            <Typography className={classes.paper}>
              {this.state.currentIndex + 1} of {this.props.annotations.length}
            </Typography>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              onClick={() => {
                this.nextAnnotation();
                this.verifyAnnotation();
              }}
            >
              Verify
            </Button>
            <Button
              className={classes.button}
              variant="contained"
              onClick={this.nextAnnotation}
            >
              Ignore
            </Button>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Typography className={classes.paper}>Finished</Typography>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              onClick={this.props.unmountSelection}
            >
              Filter Annotations
            </Button>
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }
}

VerifyAnnotations.propTypes = {
  classes: PropTypes.object
};

export default withStyles(styles)(VerifyAnnotations);

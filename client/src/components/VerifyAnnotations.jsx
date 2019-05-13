import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { Typography } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Rnd from 'react-rnd';
import { red } from "@material-ui/core/colors";

const styles = theme => ({
  root: {
    width: "90%"
  },
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
  },
  dragBox: {
    margin: '0px',
    backgroundColor: 'transparent',
    border: '2px coral solid',
    borderStyle: 'ridge'
  },
});

class VerifyAnnotations extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentIndex: 0,
      error: null
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
    this.setState({
      currentIndex: this.state.currentIndex + 1
    });
  };

  redrawAnnotation = () => {
    var redraw;
    if (this.state.redraw) {
      redraw = false
    }
    else {
      redraw = true
    }
    this.setState({
      redraw: redraw
    });
  };

  render() {
    const { classes } = this.props;
    var annotation = this.props.annotations[this.state.currentIndex];
    return (
      <React.Fragment>
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
            {!annotation.image ? (
              <Typography className={classes.paper}>No Image</Typography>
            ) : (
              <div>
                {this.state.redraw ?   
                  <div>              
                    <Rnd 
                      id="dragBox"
                      className={classes.dragBox}
                      default={{
                        x: 30,
                        y: 30,
                        width: 60,
                        height: 60,
                      }}
                      minWidth={25}
                      minHeight={25}
                      maxWidth={900}
                      maxHeight={650}
                      bounds="parent"
                    >
                    </Rnd> 
                    <img
                    className={classes.img}
                    src={`/api/annotationImages/${annotation.id}?withBox=false`}
                    alt="error"
                    />
                  </div> :
                  <img
                    className={classes.img}
                    src={`/api/annotationImages/${annotation.id}?withBox=true`}
                    alt="error"
                  />}
              </div>
            )}
            <Typography className={classes.paper}>
              {this.state.currentIndex + 1} of {this.props.annotations.length}
            </Typography>
            {this.state.redraw ? 
              <Button
                className={classes.button}
                variant="contained"
                onClick={() => {
                  this.redrawAnnotation();
                }}
              >
                Cancel
              </Button> :
              <Button
              className={classes.button}
              variant="contained"
              color="primary"
              onClick={() => {
                this.redrawAnnotation();
              }}
              >
                Redraw Box
              </Button>
            }
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

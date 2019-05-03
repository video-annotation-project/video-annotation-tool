import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { Button } from "@material-ui/core";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

import VerifySelection from "./VerifySelection.jsx";

const styles = theme => ({
  root: {
    width: "90%"
  },
  button: {
    marginTop: theme.spacing.unit,
    marginRight: theme.spacing.unit
  },
  actionsContainer: {
    marginBottom: theme.spacing.unit * 2
  },
  resetContainer: {
    padding: theme.spacing.unit * 3
  }
});

class Verify extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectionMounted: true,
      selectedUser: "0",
      selectedVideo: null,
      selectedConcept: null
    };
  }

  unmountSelection = () => {
    this.setState({
      selectionMounted: !this.state.selectionMounted
    });
  };

  getUsers = async () => {
    return axios
      .get(`/api/users`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      })
      .then(res => res.data)
      .catch(error => {
        this.setState({
          isloaded: true,
          error: error
        });
      });
  };

  getVideos = async () => {
    return axios
      .get(`/api/unverifiedVideosByUser/` + this.state.selectedUser, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      })
      .then(res => res.data)
      .catch(error => {
        this.setState({
          isloaded: true,
          error: error
        });
      });
  };

  getConcepts = async () => {
    return axios
      .get(
        `/api/unverifiedConceptsByUserVideo/` +
          this.state.selectedUser +
          `/` +
          this.state.selectedVideo,
        {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") }
        }
      )
      .then(res => res.data)
      .catch(error => {
        this.setState({
          isloaded: true,
          error: error
        });
      });
  };

  handleChangeUser = event => {
    this.setState({ selectedUser: event.target.value });
  };

  handleChangeVideo = event => {
    this.setState({ selectedVideo: event.target.value });
  };

  handleChangeConcept = event => {
    this.setState({ selectedConcept: event.target.value });
  };

  handleReset = () => {
    this.setState({
      selectedUser: "0",
      selectedVideo: null,
      selectedConcept: null
    });
  };

  render() {
    let selection = "";
    if (this.state.selectionMounted) {
      selection = (
        <VerifySelection
          selectedUser={this.state.selectedUser}
          selectedVideo={this.state.selectedVideo}
          selectedConcept={this.state.selectedConcept}
          getUsers={this.getUsers}
          getVideos={this.getVideos}
          getConcepts={this.getConcepts}
          handleChangeUser={this.handleChangeUser}
          handleChangeVideo={this.handleChangeVideo}
          handleChangeConcept={this.handleChangeConcept}
          handleReset={this.handleReset}
          unmountSelection={this.unmountSelection}
        />
      );
    } else {
      selection = (
        <Paper
          square
          elevation={0}
          className={this.props.classes.resetContainer}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={this.unmountSelection}
          >
            Filter Annotations
          </Button>
          <Typography>Selected User: {this.state.selectedUser}</Typography>
          <Typography>Selected Video: {this.state.selectedVideo}</Typography>
          <Typography>
            Selected Concept: {this.state.selectedConcept}
          </Typography>
        </Paper>
      );
    }

    return <React.Fragment>{selection}</React.Fragment>;
  }
}

Verify.propTypes = {
  classes: PropTypes.object
};

export default withStyles(styles)(Verify);

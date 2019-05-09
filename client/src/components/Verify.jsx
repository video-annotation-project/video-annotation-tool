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
      selectedVideos: [],
      selectedConcepts: [],
      annotations: [],
      error: null
    };
  }

  unmountSelection = () => {
    if (!this.state.selectionMounted) {
      this.handleReset();
    }
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
          error: error
        });
      });
  };

  getConcepts = async () => {
    return axios
      .get("/api/unverifiedConceptsByUserVideo/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        params: {
          selectedUser: this.state.selectedUser,
          selectedVideos: this.state.selectedVideos
        }
      })
      .then(res => res.data)
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  getAnnotations = async () => {
    return axios
      .get(`/api/unverifiedAnnotationsByUserVideoConcept/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        params: {
          selectedUser: this.state.selectedUser,
          selectedVideos: this.state.selectedVideos,
          selectedConcepts: this.state.selectedConcepts
        }
      })
      .then(res => res.data)
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  handleGetAnnotations = async () => {
    let annotations = await this.getAnnotations();

    if (!annotations) {
      return;
    }

    this.setState({
      annotations: annotations
    });

    console.log(this.state.annotations);
  };

  handleChangeUser = event => {
    this.setState({ selectedUser: event.target.value });
  };

  handleChangeVideo = event => {
    if (!this.state.selectedVideos.includes(event.target.value)) {
      this.setState({
        selectedVideos: this.state.selectedVideos.concat(event.target.value)
      });
    } else {
      this.setState({
        selectedVideos: this.state.selectedVideos.filter(
          videoid => videoid !== event.target.value
        )
      });
    }
  };

  handleChangeConcept = event => {
    if (!this.state.selectedConcepts.includes(event.target.value)) {
      this.setState({
        selectedConcepts: this.state.selectedConcepts.concat(event.target.value)
      });
    } else {
      this.setState({
        selectedConcepts: this.state.selectedConcepts.filter(
          conceptid => conceptid !== event.target.value
        )
      });
    }
  };

  handleReset = () => {
    this.setState({
      selectedUser: "0",
      selectedVideos: [],
      selectedConcepts: []
    });
  };

  render() {
    let selection = "";
    if (this.state.selectionMounted) {
      selection = (
        <VerifySelection
          selectedUser={this.state.selectedUser}
          selectedVideos={this.state.selectedVideos}
          selectedConcepts={this.state.selectedConcepts}
          getUsers={this.getUsers}
          getVideos={this.getVideos}
          getConcepts={this.getConcepts}
          handleChangeUser={this.handleChangeUser}
          handleChangeVideo={this.handleChangeVideo}
          handleChangeConcept={this.handleChangeConcept}
          handleReset={this.handleReset}
          handleGetAnnotations={this.handleGetAnnotations}
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
          <Typography>Selected Videos: {this.state.selectedVideos}</Typography>
          <Typography>
            Selected Concepts: {this.state.selectedConcepts}
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

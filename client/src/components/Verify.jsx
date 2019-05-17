import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";

import VerifySelection from "./VerifySelection.jsx";
import VerifyAnnotations from "./VerifyAnnotations.jsx";

const styles = theme => ({
  root: {
    width: "90%"
  },
  button: {
    margin: theme.spacing.unit
  },
  resetContainer: {
    padding: theme.spacing.unit * 3
  },
  list: {
    width: "100%",
    backgroundColor: theme.palette.background.paper
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
    padding: theme.spacing.unit * 5
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
      error: null,
      isLoaded: false
    };
  }

  componentDidMount() {
    console.log(this.state);
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

  handleListClick = async (name, id) => {
    let selected = this.state.annotations[id];

    if (selected.expanded === undefined) {
      selected.expanded = true;
    } else {
      selected.expanded = !selected.expanded;
    }
    this.setState({
      isLoaded: true
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
          <VerifyAnnotations
            annotations={this.state.annotations}
            unmountSelection={this.unmountSelection}
          />
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

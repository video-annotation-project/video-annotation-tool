import React from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import StepContent from "@material-ui/core/StepContent";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";

import VerifySelectUser from "./VerifySelectUser.jsx";
import VerifySelectVideo from "./VerifySelectVideo.jsx";

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

function getSteps() {
  return ["Users", "Videos", "Concepts"];
}

function getStepContent(step) {
  switch (step) {
    case 0:
      return "Select a user";
    case 1:
      return "Select a video";
    case 2:
      return "Select a concept";
    default:
      return "Unknown step";
  }
}

class Verify extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeStep: 0,
      selectedUser: null,
      selectedVideo: null,
      users: [],
      videos: [],
      isLoaded: false,
      error: null
    };
  }

  // getAllUsers = async () => {
  //   return axios
  //     .get(`/api/users`, {
  //       headers: { Authorization: "Bearer " + localStorage.getItem("token") }
  //     })
  //     .then(res => res.data)
  //     .catch(error => {
  //       this.setState({
  //         isloaded: true,
  //         error: error
  //       });
  //     });
  // };

  getAllUsers = async () => {
    return [
      {
        id: 16,
        username: "jccho"
      },
      {
        id: 17,
        username: "jccho1"
      }
    ];
  };

  getAllVideos = async () => {
    return [
      {
        id: 1,
        filename: "vid1"
      },
      {
        id: 2,
        filename: "vid2"
      }
    ];
  };

  componentDidMount = async () => {
    let users = await this.getAllUsers();
    let videos = await this.getAllVideos();

    if (!users || !videos) {
      return;
    }
    this.setState({
      isLoaded: true,
      users: users,
      videos: videos
    });
  };

  handleChangeUser = event => {
    this.setState({ selectedUser: event.target.value });
  };

  handleChangeVideo = event => {
    this.setState({ selectedVideo: event.target.value });
  };

  handleNext = () => {
    this.setState(state => ({
      activeStep: state.activeStep + 1
    }));
  };

  handleBack = () => {
    this.setState(state => ({
      activeStep: state.activeStep - 1
    }));
  };

  handleReset = () => {
    this.setState({
      activeStep: 0,
      selectedUser: null,
      selectedVideo: null
    });
  };

  getStepForm = step => {
    switch (step) {
      case 0:
        return (
          <VerifySelectUser
            users={this.state.users}
            value={this.state.selectedUser}
            handleChange={this.handleChangeUser}
          />
        );
      case 1:
        return (
          <VerifySelectVideo
            videos={this.state.videos}
            value={this.state.selectedVideo}
            handleChange={this.handleChangeVideo}
          />
        );
      case 2:
        return (
          <VerifySelectUser
            users={this.state.users}
            value={this.state.selectedUser}
            handleChange={this.handleChangeUser}
          />
        );
      default:
        return "Unknown step";
    }
  };

  render() {
    const { activeStep, error, isLoaded } = this.state;
    const { classes } = this.props;
    const steps = getSteps();

    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error) {
      return <List>Error: {error.message}</List>;
    }

    return (
      <div className={classes.root}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                <Typography>{getStepContent(index)}</Typography>
                {this.getStepForm(index)}
                {/* <VerifySelectUser
                  users={users}
                  value={selectedUser}
                  handleChange={this.handleChange}
                /> */}
                <div className={classes.actionsContainer}>
                  <div>
                    <Button
                      disabled={activeStep === 0}
                      onClick={this.handleBack}
                      className={classes.button}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={this.handleNext}
                      className={classes.button}
                    >
                      {activeStep === steps.length - 1 ? "Finish" : "Next"}
                    </Button>
                  </div>
                </div>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === steps.length && (
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography>All steps completed - you&apos;re finished</Typography>
            <Button onClick={this.handleReset} className={classes.button}>
              Reset
            </Button>
          </Paper>
        )}
      </div>
    );
  }
}

Verify.propTypes = {
  classes: PropTypes.object
};

export default withStyles(styles)(Verify);

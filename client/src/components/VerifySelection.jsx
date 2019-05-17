import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import StepContent from "@material-ui/core/StepContent";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";

import VerifySelectUser from "./VerifySelectUser.jsx";
import VerifySelectVideo from "./VerifySelectVideo.jsx";
import VerifySelectConcept from "./VerifySelectConcept.jsx";

const styles = theme => ({
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

class VerifySelection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeStep: 0,
      isLoaded: false,
      error: null
    };
  }

  componentDidMount = () => {
    this.setState({
      isLoaded: true
    });
  };

  componentWillUnmount = () => {
    this.props.handleGetAnnotations();
  };

  getStepForm = step => {
    switch (step) {
      case 0:
        return (
          <VerifySelectUser
            value={this.props.selectedUser}
            getUsers={this.props.getUsers}
            handleChange={this.props.handleChangeUser}
          />
        );
      case 1:
        return (
          <VerifySelectVideo
            value={this.props.selectedVideos}
            getVideos={this.props.getVideos}
            handleChange={this.props.handleChangeVideo}
          />
        );
      case 2:
        return (
          <VerifySelectConcept
            value={this.props.selectedConcept}
            getConcepts={this.props.getConcepts}
            handleChange={this.props.handleChangeConcept}
          />
        );
      default:
        return "Unknown step";
    }
  };

  didNotSelect = step => {
    switch (step) {
      case 0:
        return this.props.selectedUser == null;
      case 1:
        return this.props.selectedVideos.length === 0;
      case 2:
        return this.props.selectedConcepts.length === 0;
      default:
        return true;
    }
  };

  handleNext = () => {
    this.setState(state => ({
      activeStep: state.activeStep + 1
    }));
  };

  handleReset = () => {
    this.props.handleReset();
    this.setState({
      activeStep: 0
    });
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
                <div className={classes.actionsContainer}>
                  <div>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={this.didNotSelect(index)}
                      onClick={
                        activeStep === steps.length - 1
                          ? this.props.unmountSelection
                          : this.handleNext
                      }
                      className={classes.button}
                    >
                      {activeStep === steps.length - 1 ? "Finish" : "Next"}
                    </Button>
                    <Button
                      disabled={activeStep === 0}
                      onClick={this.handleReset}
                      className={classes.button}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </div>
    );
  }
}

VerifySelection.propTypes = {
  classes: PropTypes.object
};

export default withStyles(styles)(VerifySelection);

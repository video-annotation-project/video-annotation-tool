import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import StepContent from "@material-ui/core/StepContent";
import Button from "@material-ui/core/Button";

import VerifySelectUser from "./VerifySelectUser.jsx";
import VerifySelectVideo from "./VerifySelectVideo.jsx";
import VerifySelectConcept from "./VerifySelectConcept.jsx";
import VerifySelectUnsure from "./VerifySelectUnsure";

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
  return ["Users", "Videos", "Concepts", "Unsure"];
}

class VerifySelection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeStep: 0
    };
  }

  getStepForm = step => {
    switch (step) {
      case 0:
        return (
          <VerifySelectUser
            value={this.props.selectedUsers}
            getUsers={this.props.getUsers}
            selectUser={this.props.selectUser}
            handleChange={this.props.handleChangeList("selectedUsers")}
          />
        );
      case 1:
        return (
          <VerifySelectVideo
            value={this.props.selectedVideos}
            getVideos={this.props.getVideos}
            handleChange={this.props.handleChangeList("selectedVideos")}
          />
        );
      case 2:
        return (
          <VerifySelectConcept
            value={this.props.selectedConcepts}
            getConcepts={this.props.getConcepts}
            handleChange={this.props.handleChangeList("selectedConcepts")}
          />
        );
      case 3:
        return (
            <VerifySelectUnsure
                value={this.props.selectedUnsure}
                getUnsure={this.props.getUnsure}
                handleChange={this.props.handleChangeSwitch("selectedUnsure")}
            />
        );
      default:
        return "Unknown step";
    }
  };

  didNotSelect = step => {
    switch (step) {
      case 0:
        return this.props.selectedUsers.length === 0;
      case 1:
        return this.props.selectedVideos.length === 0;
      case 2:
        return this.props.selectedConcepts.length === 0;
      default:
        return false;
    }
  };

  handleNext = () => {
    this.setState(state => ({
      activeStep: state.activeStep + 1
    }));
  };

  resetState = () => {
    this.props.resetState();
    this.setState({
      activeStep: 0
    });
  };

  render() {
    const { activeStep } = this.state;
    const { classes } = this.props;
    const steps = getSteps();

    return (
      <div className={classes.root}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {this.getStepForm(index)}
                <div className={classes.actionsContainer}>
                  <div>
                    <Button
                      onClick={this.resetState}
                      className={classes.button}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={this.didNotSelect(index)}
                      onClick={
                        activeStep === steps.length - 1
                          ? this.props.toggleSelection
                          : this.handleNext
                      }
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
      </div>
    );
  }
}

VerifySelection.propTypes = {
  classes: PropTypes.object
};

export default withStyles(styles)(VerifySelection);

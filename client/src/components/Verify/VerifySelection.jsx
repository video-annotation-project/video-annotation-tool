import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import FormControl from '@material-ui/core/FormControl';

import SelectUser from '../Utilities/SelectUser';
import SelectVideo from '../Utilities/SelectVideo';
import SelectConcept from '../Utilities/SelectConcept';
import SelectUnsure from '../Utilities/SelectUnsure';
import VerifyAnnotationCollection from '../Utilities/SelectAnnotationCollection';

const styles = theme => ({
  button: {
    marginTop: theme.spacing(3),
    marginRight: theme.spacing()
  },
  actionsContainer: {
    marginBottom: theme.spacing(2)
  },
  resetContainer: {
    padding: theme.spacing(3)
  },
  formControl: {
    marginTop: theme.spacing(2),
    maxHeight: '400px',
    overflow: 'auto'
  },
  switch: {
    marginLeft: theme.spacing(2)
  }
});

function getSteps() {
  return [
    'Annotation Collections',
    'Users',
    'Videos',
    'Concepts',
    'Extra Options'
  ];
}

class VerifySelection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeStep: 0
    };
  }

  getStepForm = step => {
    const {
      classes,
      selectedAnnotationCollections,
      getAnnotationCollections,
      handleChangeList,
      handleChange,
      handleSelectAll,
      handleUnselectAll,
      handleChangeSwitch,
      selectedUsers,
      getUsers,
      selectUser,
      selectedVideos,
      getVideos,
      getVideoCollections,
      selectedConcepts,
      getConcepts,
      getConceptCollections,
      selectedUnsure,
      getUnsure,
      selectedTrackingFirst,
      excludeTracking
    } = this.props;

    switch (step) {
      case 0:
        return (
          <VerifyAnnotationCollection
            value={selectedAnnotationCollections}
            getAnnotationCollections={getAnnotationCollections}
            selectedAnnotationCollections={selectedAnnotationCollections}
            handleChangeList={handleChangeList(
              selectedAnnotationCollections,
              'selectedAnnotationCollections'
            )}
          />
        );
      case 1:
        return (
          <SelectUser
            value={selectedUsers}
            getUsers={getUsers}
            selectUser={selectUser}
            handleChangeList={handleChangeList(selectedUsers, 'selectedUsers')}
            handleSelectAll={handleSelectAll}
            handleUnselectAll={handleUnselectAll}
          />
        );
      case 2:
        return (
          <SelectVideo
            value={selectedVideos}
            getVideos={getVideos}
            getVideoCollections={getVideoCollections}
            handleChange={handleChange('selectedVideos')}
            handleChangeList={handleChangeList(
              selectedVideos,
              'selectedVideos'
            )}
            handleSelectAll={handleSelectAll}
            handleUnselectAll={handleUnselectAll}
          />
        );
      case 3:
        return (
          <SelectConcept
            value={selectedConcepts}
            getConcepts={getConcepts}
            getConceptCollections={getConceptCollections}
            handleChange={handleChange('selectedConcepts')}
            handleChangeList={handleChangeList(
              selectedConcepts,
              'selectedConcepts'
            )}
            handleSelectAll={handleSelectAll}
            handleUnselectAll={handleUnselectAll}
          />
        );
      case 4:
        return (
          <div>
            {selectedAnnotationCollections.length ? (
              ''
            ) : (
              <SelectUnsure
                value={selectedUnsure}
                getUnsure={getUnsure}
                handleChangeSwitch={handleChangeSwitch('selectedUnsure')}
              />
            )}
            <div>
              <FormControl component="fieldset" className={classes.formControl}>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        className={classes.switch}
                        checked={selectedTrackingFirst}
                        onChange={handleChangeSwitch('selectedTrackingFirst')}
                        value="selectedTrackingFirst"
                        color="primary"
                        disabled={!excludeTracking}
                      />
                    }
                    label="Tracking Video Verification"
                  />
                </FormGroup>
              </FormControl>
            </div>
            {selectedAnnotationCollections.length === 0 ? (
              ''
            ) : (
              <div>
                <FormControl
                  component="fieldset"
                  className={classes.formControl}
                >
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          className={classes.switch}
                          checked={excludeTracking}
                          onChange={handleChangeSwitch('excludeTracking')}
                          value="excludeTracking"
                          color="primary"
                          disabled={selectedTrackingFirst}
                        />
                      }
                      label="Exclude Tracking"
                    />
                  </FormGroup>
                </FormControl>
              </div>
            )}
          </div>
        );
      default:
        return 'Unknown step';
    }
  };

  didNotSelect = step => {
    const { selectedUsers, selectedVideos, selectedConcepts } = this.props;
    switch (step) {
      case 0:
        return false;
      case 1:
        return selectedUsers.length === 0;
      case 2:
        return selectedVideos.length === 0;
      case 3:
        return selectedConcepts.length === 0;
      default:
        return false;
    }
  };

  handleCollection = () => {
    this.setState({
      activeStep: 4
    });
  };

  handleNext = () => {
    this.setState(state => ({
      activeStep: state.activeStep + 1
    }));
  };

  handleBack = step => {
    const { resetStep } = this.props;
    const { activeStep } = this.state;

    resetStep(step);
    this.setState({
      activeStep: activeStep - 1
    });
  };

  resetState = () => {
    const { resetState } = this.props;

    resetState();
    this.setState({
      activeStep: 0
    });
  };

  renderProgressButtonText = (isLast, isCollection) => {
    if (isLast) return 'Finish';
    if (isCollection) return 'Skip this step';
    return 'Next';
  };

  render() {
    const {
      classes,
      selectedAnnotationCollections,
      toggleSelection
    } = this.props;
    const { activeStep } = this.state;
    const steps = getSteps();

    return (
      <div>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {this.getStepForm(index)}
                <div className={classes.actionsContainer}>
                  <div>
                    <Button
                      variant="contained"
                      onClick={this.resetState}
                      className={classes.button}
                    >
                      Reset All
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => {
                        this.handleBack(activeStep);
                      }}
                      className={classes.button}
                      disabled={
                        activeStep === 0 ||
                        selectedAnnotationCollections.length > 0
                      }
                    >
                      Back
                    </Button>
                    {activeStep === 0 &&
                    selectedAnnotationCollections.length !== 0 ? (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleCollection}
                        className={classes.button}
                      >
                        Skip To Step 5
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={this.didNotSelect(index)}
                        onClick={
                          activeStep === steps.length - 1
                            ? toggleSelection
                            : this.handleNext
                        }
                        className={classes.button}
                      >
                        {this.renderProgressButtonText(
                          activeStep === steps.length - 1,
                          activeStep === 0 &&
                            selectedAnnotationCollections.length === 0
                        )}
                      </Button>
                    )}
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

export default withStyles(styles)(VerifySelection);

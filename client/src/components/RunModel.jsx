import React, { Component } from 'react';
import axios from 'axios';

import ErrorModal from './ErrorModal.jsx';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

//Steppers for choosing model and videos
import PropTypes from 'prop-types';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';

//Display progress circle
import CircularProgress from '@material-ui/core/CircularProgress';

//Select Model
import { FormControl } from '@material-ui/core';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';


const styles = theme => ({
  root: {
    width: '90%'
  },
  form: {
    width: '10%'
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  button: {
    marginTop: theme.spacing.unit,
    marginRight: theme.spacing.unit,
  },
  actionsContainer: {
    marginBottom: theme.spacing.unit * 2,
  },
  resetContainer: {
    padding: theme.spacing.unit * 3,
  },
});


class RunModel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      models: null,
      model: '',
      activeStep: 0,
      errorMsg: null,
      errorOpen: false //modal code
    };
  }

  getSteps = () => {
    return ['Select model', 'Select videos'];
  }
  
  getStepContent = (step) => {
    switch (step) {
      case 0:
        return this.selectModel();
      case 1:
        return 'Video Selector';
      default:
        return 'Unknown step';
    }
  }

  selectModel = () => {
    return (
      <FormControl className={this.props.classes.form}>
        <InputLabel>Select Model</InputLabel>
        <Select
          value={this.state.model}
          onChange={this.handleModelSelect}
        >
          {this.state.models.map(model => (
            <MenuItem
              key={model.name}
              value={model.name}
            >
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  handleModelSelect = (event) => {
    this.setState({
      model: event.target.value
    });
  }

  handleNext = () => {
    this.setState(state => ({
      activeStep: state.activeStep + 1,
    }));
  };

  handleBack = () => {
    this.setState(state => ({
      activeStep: state.activeStep - 1,
    }));
  };

  handleReset = () => {
    this.setState({
      activeStep: 0,
    });
  };

  componentDidMount = () => {
    this.loadExistingModels();
  }

  loadExistingModels = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.get(`/api/models`, config).then(res => {
      this.setState({
        models: res.data
      })
    }).catch(error => {
      console.log('Error in get /api/models');
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    })
  }
  
  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      const model = this.findModel(e.target.value);
      if (model) {
        //Model exists
        //Load model
        this.loadModel(model);
      }
    } else {
      this.searchModels(e.target.value + e.key);
    }
  }

  handleKeyDown = (e) => {
    //Backspace does not trigger handleKeyPress
    //So this will search when backspace
    if (e.keyCode === 8 || e.keyCode === 46) {
      this.searchModels(e.target.value.slice(0,-1));
    }
  }

  searchModels = (search) => {
    const modelsLikeSearch = this.state.models.filter(model => {
      return model.name.match(new RegExp(search, 'i'))
    });

    this.setState({
      modelsLikeSearch: modelsLikeSearch.slice(0, 10)
    })
  };

  findModel = (modelName) => {
    const match = this.state.models.find(model => {
      return model.name === modelName;
    });
    return match ? match.name : null;
  };

  loadModel = (model) => {
    alert('Loaded ' + model);
    console.log(model);
  }

  //Code for closing modal
  handleClose = () => {
    this.setState({ errorOpen: false });
  };

  render() {
    const { classes } = this.props;
    const steps = this.getSteps();
    const {
      models,
      model,
      activeStep, 
      errorMsg, 
      errorOpen
    } = this.state;
    if (!models) {
      return (
        <div>Loading...</div>
      )
    }
    return (
      <div className={classes.root}>
        <div className={classes.center}>
          <h1 style={{color: 'red'}}>This page is still in progress</h1>
          <Typography variant="display1">Run a trained model on video(s)</Typography><br />
          <ErrorModal 
            errorMsg={errorMsg} 
            open={errorOpen} 
            handleClose={this.handleClose}
          />
        </div>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {this.getStepContent(index)}
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
                      disabled={activeStep === 0 & model === '' ? true: false}
                    >
                      {activeStep === steps.length - 1 ? 'Run Model' : 'Next'}
                    </Button>
                  </div>
                </div>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === steps.length && (
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography>Model is running/generating images...</Typography>
            <CircularProgress/>
            <Button onClick={this.handleReset} className={classes.button}>
              Stop
            </Button>
            
          </Paper>
        )}
      </div>
    );
  }
}

RunModel.propTypes = {
  classes: PropTypes.object,
};

export default withStyles(styles)(RunModel);

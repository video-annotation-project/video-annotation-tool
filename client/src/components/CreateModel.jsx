import React, { Component } from "react";
import axios from "axios";

//Steppers for choosing model and videos
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import StepContent from "@material-ui/core/StepContent";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";

// Create model name
import TextField from '@material-ui/core/TextField';

// Select concept
import { FormControl } from "@material-ui/core";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Checkbox from "@material-ui/core/Checkbox";

import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import Swal from "sweetalert2";

const styles = theme => ({
  root: {
    width: "90%",
  },
  checkSelector: {
    maxHeight: "150px",
    overflow: "auto"
  },
  textField: {
    marginLeft: theme.spacing,
    marginRight: theme.spacing,
    width: 200,
  },
  actionsContainer: {
    marginBottom: theme.spacing.unit * 2
  },
  button: {
    marginTop: theme.spacing.unit,
    marginRight: theme.spacing.unit
  },
  resetContainer: {
    padding: theme.spacing.unit * 3
  },
  ModelNameForm: {
    display: 'flex',
    flexWrap: 'wrap',
  }
});

class CreateModel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modelName: '',
      models: [],
      concepts: [],
      conceptsSelected: [],
      activeStep: 0
    };
  }

  getSteps = () => {
    return [
      'Name model',
      'Select species',
   ];
  }

  getStepContent = step => {
    switch (step) {
      case 0:
        return this.nameModel();
      case 1:
        return this.selectConcepts();
      default:
        return "Unknown step";
    }
  };

  componentDidMount = () => {
    this.loadExistingModels();
    this.loadConcepts();
  };

  loadExistingModels = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .get(`/api/models`, config)
      .then(res => {
        let models = []
        res.data.forEach(model => {
          models.push(model.name);
        })
        this.setState({
          models: models
        });
      })
      .catch(error => {
        console.log("Error in get /api/models");
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  loadConcepts = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .get(`/api/concepts`, config)
      .then(res => {
        this.setState({
          concepts: res.data
        });
      })
      .catch(error => {
        console.log("Error in get /api/concepts");
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  nameModel = () => {
    const classes = this.props.classes;
    return (
      <form 
        className={classes.ModelNameForm}
        onSubmit={this.handleNext}
      >
        <TextField
          margin='normal'
          name='modelName'
          label='Model Name'
          value={this.state.modelName}
          onChange={this.handleChange}
          autoFocus={true}
        />
      </form>
    )
  }

  //Handle concept checkbox selections
  checkboxSelect = (stateName, id) => event => {
    let deepCopy = JSON.parse(JSON.stringify(this.state[stateName]));
    if (event.target.checked) {
      deepCopy.push(id);
    } else {
      deepCopy = deepCopy.filter(user => user !== id);
    }
    this.setState({
      [stateName]: deepCopy
    });
  };

  selectConcepts = () => {
    const classes = this.props.classes;
    if (!this.state.concepts) {
      return (
        <div>Loading...</div>
      )
    }
    return (
      <FormControl
        component="fieldset"
        className={classes.checkSelector}
      >
        <FormLabel component="legend">Select Species to Train With</FormLabel>
        <FormGroup>
          {this.state.concepts.map(concept => (
            <div key={concept.name}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={this.checkboxSelect('conceptsSelected', concept.id)}
                    color='primary'
                    checked={
                      this.state.conceptsSelected.includes(concept.id)
                    }
                  />
                }
                label={concept.name}
              >
              </FormControlLabel>
            </div>
          ))}
        </FormGroup>
      </FormControl>
    )
  }

  postModel = async () => {
    const {modelName, conceptsSelected} = this.state;
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      name: modelName,
      concepts: conceptsSelected
    };
    try {
      await axios.post(`/api/models`, body, config);
      this.loadExistingModels();
    } catch (error) {
      console.log("Error in post /api/models");
      if (error.response) {
        Swal.fire(error.response.data.detail, "", "error");
      }
    }
  };

  handleNext = event => {
    event.preventDefault()
    // If step = 0 then need to check
    // If model name exists
    if (this.state.activeStep === 0) {
      if (this.state.models.includes(
        this.state.modelName)) {
        Swal.fire('Model Already Exists', '', "info");
        return;
      }
    }
    // If step = 2 then model ready to submit
    if (this.state.activeStep === 1) {
      this.postModel();
    }

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
      modelName: '',
      conceptsSelected: []
    });
  };

  render() {
    const { classes } = this.props;
    const steps = this.getSteps();
    const { 
      models,
      activeStep,
      modelName,
      conceptsSelected
    } = this.state;
    if (!models) {
      return <div>Loading...</div>;
    }
    return (
      <div className={classes.root}>
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
                      disabled={
                        (activeStep === 0 && modelName === "") ||
                        (activeStep === 1 && conceptsSelected.length < 1)
                      }
                    >
                      {activeStep === steps.length - 1 ? "Create Model" : "Next"}
                    </Button>
                  </div>
                </div>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === steps.length && (
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography>Model has been created...</Typography>
            <Button onClick={this.handleReset} className={classes.button}>
              Another One...
            </Button>
          </Paper>
        )}
      </div>
    );
  }
}

export default withStyles(styles)(CreateModel);

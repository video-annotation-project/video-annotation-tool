import React, { Component } from "react";
import axios from "axios";

import { withStyles } from "@material-ui/core/styles";
import LinearProgress from '@material-ui/core/LinearProgress';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';


const styles = theme => ({
	trainStatus: {
    marginTop: '20px',
    marginBottom: '5px',
	},
	progressBar: {
		height: '8px',
	},
	progressText: {
    marginTop: '20px',
		marginBottom: '8px',
	},
  button: {
    marginBottom: '30px',
    marginLeft: '20px',
  },
  stopTraining: {
    marginTop: '20px',
  },
});

class ModelProgress extends Component {

	constructor(props){
	    super(props);

	    this.state = {
          running: false,
          currentEpoch: 0,
          currentBatch: 0,
          maxEpoch: 0,
          stepsPerEpoch: 0,
          progress: 0,
	    };

	    this.loadProgressInfo();
	    this.loadProgressInfo = this.loadProgressInfo.bind(this);
  }

  componentDidMount() {
  	this.interval = setInterval(() => this.loadProgressInfo(), 500);
	}

	componentWillUnmount() {
	  clearInterval(this.interval);
	}

  loadProgressInfo = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .get(`/api/modelTab/progress`, config)
      .then(res => {
        const progress = res.data[0];

        this.setState({
            running: progress.running,
            currentEpoch: progress.curr_epoch + 1,
            currentBatch: progress.curr_batch + 1,
            maxEpoch: progress.max_epoch,
            stepsPerEpoch: progress.steps_per_epoch,
            epochProgress: ((progress.curr_epoch + 1) / progress.max_epoch) * 100,
            batchProgress: ((progress.curr_batch + 1) / (progress.steps_per_epoch)) * 100,
        });
      })
      .catch(error => {
        console.log("Error in get /api/modelTab");
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  render(){
    const { classes } = this.props;
    const { activeStep, steps } = this.props;

    return (
      <div className={this.props.className}>
      	<Typography variant="h6" gutterBottom className={classes.trainStatus}>
          Training Status
        </Typography>
        {activeStep >= steps.length && (
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography variant="subtitle2" gutterBottom>
              Model has started training...
            </Typography>
            <div className={classes.stopTraining}>
              <CircularProgress />
              <Button onClick={this.props.handleStop} className={classes.button}>
                Stop
              </Button>
            </div>
          </Paper>
        )}
      	{this.state.running && activeStep === steps.length ? 
      		<div>
      			<Typography
              variant="body1" gutterBottom 
              className={classes.progressText} >Epoch: {this.state.currentEpoch} / {this.state.maxEpoch}
            </Typography>
						<LinearProgress 
							disableShrink 
							className={classes.progressBar} 
							variant="determinate" 
							value={this.state.epochProgress} 
						/>
      			<Typography 
              variant="body1" gutterBottom 
              className={classes.progressText}> Batch: {this.state.currentBatch} / {this.state.stepsPerEpoch}
            </Typography>
						<LinearProgress 
							disableShrink 
							className={classes.progressBar} 
							variant="determinate" 
							value={this.state.batchProgress} 
							color="secondary" />
					</div>
				: activeStep !== steps.length && (
  				<Typography variant="subtitle2" gutterBottom>
            Not currently training
          </Typography>)
				}
      </div>
    )
  }
}

export default withStyles(styles)(ModelProgress);

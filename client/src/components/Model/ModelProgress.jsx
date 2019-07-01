import React, { Component } from "react";
import axios from "axios";

import { withStyles } from "@material-ui/core/styles";
import LinearProgress from '@material-ui/core/LinearProgress';

const styles = theme => ({
	trainStatus: {
		marginBottom: 0,
	},
	progressBar: {
		height: '8px',
	},
	progressText: {
		marginBottom: '5px',
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

    return (
      <div className={this.props.className}>
      	<h3 className={classes.trainStatus}> Training Status: </h3>
      	{this.state.running ? 
      		<div>
      			<h4 className={classes.progressText} >Epoch: {this.state.currentEpoch} / {this.state.maxEpoch}</h4>
						<LinearProgress 
							disableShrink 
							className={classes.progressBar} 
							variant="determinate" 
							value={this.state.epochProgress} 
						/>
      			<h4 className={classes.progressText} >Batch: {this.state.currentBatch} / {this.state.stepsPerEpoch}</h4>
						<LinearProgress 
							disableShrink 
							className={classes.progressBar} 
							variant="determinate" 
							value={this.state.batchProgress} 
							color="secondary" />
					</div>
				:
					<h4>Not training</h4>
				}
      </div>
    )
  }
}

export default withStyles(styles)(ModelProgress);

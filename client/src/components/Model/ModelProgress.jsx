import React, { Component } from 'react';
import axios from 'axios';

import { withStyles } from '@material-ui/core/styles';
import LinearProgress from '@material-ui/core/LinearProgress';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import PredictProgress from './PredictProgress';

const styles = () => ({
  trainStatus: {
    marginTop: '20px',
    marginBottom: '5px'
  },
  progressBar: {
    height: '8px',
    width: '82%'
  },
  progressText: {
    marginTop: '20px',
    marginBottom: '8px'
  },
  button: {
    marginBottom: '30px',
    marginLeft: '20px'
  },
  stopTraining: {
    marginTop: '20px'
  },
  progress: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'right',
    alignItems: 'right',
    width: '50%'
  }
});

class ModelProgress extends Component {
  constructor(props) {
    super(props);

    this.state = {
      running: false,
      currentEpoch: 0,
      currentBatch: 0,
      maxEpoch: 0,
      stepsPerEpoch: 0
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
    const { activeStep } = this.props;
    if (activeStep < 3) {
      return;
    }
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .get(`/api/models/progress/train`, config)
      .then(res => {
        const progress = res.data[0];

        this.setState({
          running: progress.running,
          currentEpoch: progress.curr_epoch + 1,
          currentBatch: progress.curr_batch + 1,
          maxEpoch: progress.max_epoch,
          stepsPerEpoch: progress.steps_per_epoch,
          epochProgress: ((progress.curr_epoch + 1) / progress.max_epoch) * 100,
          batchProgress:
            ((progress.curr_batch + 1) / progress.steps_per_epoch) * 100
        });
      })
      .catch(error => {
        console.log('Error in get /api/models');
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  ternaryOpBreak = (con1, con2) => {
    const { classes, activeStep, steps } = this.props;
    const {
      currentEpoch,
      maxEpoch,
      epochProgress,
      currentBatch,
      stepsPerEpoch,
      batchProgress
    } = this.state;
    let ret;
    if (con1) {
      ret = (
        <div>
          <Typography
            variant="body1"
            gutterBottom
            className={classes.progressText}
          >
            Epoch: {currentEpoch} / {maxEpoch}
          </Typography>
          <LinearProgress
            disableShrink
            className={classes.progressBar}
            variant="determinate"
            value={epochProgress}
          />
          <Typography
            variant="body1"
            gutterBottom
            className={classes.progressText}
          >
            {' '}
            Batch: {currentBatch} / {stepsPerEpoch}
          </Typography>
          <LinearProgress
            disableShrink
            className={classes.progressBar}
            variant="determinate"
            value={batchProgress}
            color="secondary"
          />
        </div>
      );
    } else if (con2) {
      ret = <PredictProgress className={classes.progress} />;
    } else {
      ret = activeStep !== steps.length && (
        <Typography variant="subtitle2" gutterBottom>
          Not currently training
        </Typography>
      );
    }
    return ret;
  };

  render() {
    const { classes, className, handleStop, activeStep, steps } = this.props;
    const {
      running,
      currentBatch,
      currentEpoch,
      maxEpoch,
      stepsPerEpoch
    } = this.state;

    return (
      <div className={className}>
        <Typography variant="h6" gutterBottom className={classes.trainStatus}>
          Training Status
        </Typography>
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography variant="subtitle2" gutterBottom>
              Model has started training...
            </Typography>
            <div className={classes.stopTraining}>
              <CircularProgress />
              <Button onClick={handleStop} className={classes.button}>
                Stop
              </Button>
            </div>
          </Paper>
        {this.ternaryOpBreak(
          running && activeStep === steps.length,
          activeStep === steps.length &&
            !running &&
            currentEpoch === maxEpoch &&
            currentBatch === stepsPerEpoch
        )}
        {/* {running && activeStep === steps.length ? (
          <div>
            <Typography
              variant="body1"
              gutterBottom
              className={classes.progressText}
            >
              Epoch: {currentEpoch} / {maxEpoch}
            </Typography>
            <LinearProgress
              disableShrink
              className={classes.progressBar}
              variant="determinate"
              value={epochProgress}
            />
            <Typography
              variant="body1"
              gutterBottom
              className={classes.progressText}
            >
              {' '}
              Batch: {currentBatch} / {stepsPerEpoch}
            </Typography>
            <LinearProgress
              disableShrink
              className={classes.progressBar}
              variant="determinate"
              value={batchProgress}
              color="secondary"
            />
          </div>
        ) : activeStep === steps.length &&
          !running &&
          currentEpoch === maxEpoch &&
          currentBatch === stepsPerEpoch ? (
          <PredictProgress className={classes.progress} />
        ) : (
          activeStep !== steps.length && (
            <Typography variant="subtitle2" gutterBottom>
              Not currently training
            </Typography>
          )
        )} */}
      </div>
    );
  }
}

export default withStyles(styles)(ModelProgress);

import React, { Component } from 'react';
import axios from 'axios';
import LinearProgress from '@material-ui/core/LinearProgress';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import SwipeableViews from 'react-swipeable-views';
import Box from '@material-ui/core/Box';
import PredictProgress from './PredictProgress';

import './ModelProgress.css';

class TrainingStatus extends Component {
  ternaryOpBreak = (con1, con2) => {
    const {
      currentEpoch,
      maxEpoch,
      epochProgress,
      currentBatch,
      stepsPerEpoch,
      batchProgress
    } = this.props;
    let ret;
    // eslint-disable-next-line no-param-reassign
    con1 = true;
    if (con1) {
      ret = (
        <div className="progressBars">
          <Typography variant="body1" gutterBottom className="progressText">
            Epoch: {currentEpoch} / {maxEpoch}
          </Typography>
          <LinearProgress
            className="progressBar"
            variant="determinate"
            value={epochProgress}
          />
          <Typography variant="body1" gutterBottom className="progressText">
            Batch: {currentBatch} / {stepsPerEpoch}
          </Typography>
          <LinearProgress
            className="progressBar"
            variant="determinate"
            value={batchProgress}
            color="secondary"
          />
        </div>
      );
    } else if (con2) {
      //
    } else {
      ret = (
        <Typography variant="subtitle2" gutterBottom>
          Not currently training
        </Typography>
      );
    }
    return ret;
  };

  render() {
    const {
      onStop,
      running,
      currentEpoch,
      currentBatch,
      maxEpoch,
      stepsPerEpoch
    } = this.props;
    return (
      <div>
        <Paper square elevation={0} className="resetContainer">
          <div>
            <Typography variant="subtitle1">Step 1/2</Typography>
            <Typography variant="subtitle2" gutterBottom>
              Model has started training...
            </Typography>
          </div>
          <Button
            onClick={onStop}
            variant="contained"
            color="secondary"
            className="stopButton"
          >
            Stop
          </Button>
        </Paper>
        {this.ternaryOpBreak(
          running,
          !running &&
            currentEpoch === maxEpoch &&
            currentBatch === stepsPerEpoch
        )}
      </div>
    );
  }
}

// eslint-disable-next-line react/prefer-stateless-function
class ServerOutput extends Component {
  render() {
    const { output } = this.props;

    return (
      <div className="codeBlock">
        <code>
          <pre>{output || 'No current output'}</pre>
        </code>
      </div>
    );
  }
}

// eslint-disable-next-line react/prefer-stateless-function
class TabPanel extends Component {
  render() {
    const { children, value, index, ...other } = this.props;

    return (
      <Typography
        component="div"
        role="tabpanel"
        hidden={value !== index}
        id={`full-width-tabpanel-${index}`}
        aria-labelledby={`full-width-tab-${index}`}
        {...other}
      >
        <Box p={3}>{children}</Box>
      </Typography>
    );
  }
}

class ModelProgress extends Component {
  constructor(props) {
    super(props);

    this.state = {
      running: false,
      tab: 0,
      currentEpoch: 0,
      currentBatch: 0,
      maxEpoch: 0,
      stepsPerEpoch: 0,
      stdout: '',
      stderr: ''
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
          // Not used?
          // epochProgress: ((progress.curr_epoch + 1) / progress.max_epoch) * 100,
          // batchProgress: ((progress.curr_batch + 1) / progress.steps_per_epoch) * 100,
          stdout: progress.std_out,
          stderr: progress.std_err
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

  handleChange = (event, newValue) => {
    console.log(newValue);
    this.setState({ tab: newValue });
  };

  render() {
    const { className, steps } = this.props;
    const {
      tab,
      running,
      currentEpoch,
      maxEpoch,
      currentBatch,
      stepsPerEpoch,
      stdout,
      stderr
    } = this.state;

    return (
      <div className={className}>
        <Tabs
          value={tab}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          onChange={this.handleChange}
          className="tabs"
        >
          <Tab label="Training Status" />
          <Tab label="Standard Output" />
          <Tab label="Standard Error" />
        </Tabs>
        <SwipeableViews index={tab}>
          <TabPanel value={tab} index={0}>
            <TrainingStatus
              onStop={this.handleStop}
              steps={steps}
              running={running}
              currentEpoch={currentEpoch}
              maxEpoch={maxEpoch}
              currentBatch={currentBatch}
              stepsPerEpoch={stepsPerEpoch}
            />
            <PredictProgress className="progress" />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <ServerOutput output={stdout} />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <ServerOutput output={stderr} />
          </TabPanel>
        </SwipeableViews>
      </div>
    );
  }
}

export default ModelProgress;

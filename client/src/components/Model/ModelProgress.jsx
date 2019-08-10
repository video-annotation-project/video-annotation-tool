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

  render() {
    return (
      <div>
        <Paper square elevation={0} className="resetContainer">
          <div>
            <Typography variant="subtitle1">Step 1/2</Typography>
            <Typography variant="subtitle2" gutterBottom>
              Model has started training...
            </Typography>
          </div>
          <div>
            <Button
              onClick={this.props.onStop}
              variant="contained"
              color="secondary"
              className="stopButton"
            >
              Stop Training
            </Button>
            <Button
              onClick={this.props.postStopFlag}
              variant="contained"
              className="terminateButton"
            >
              Terminate
            </Button>
          </div>
        </Paper>
        <div className="progressBars">
          <Typography variant="body1" gutterBottom className="progressText">
            Epoch: {this.props.currentEpoch} / {this.props.maxEpoch}
          </Typography>
          <LinearProgress
            className="progressBar"
            variant="determinate"
            value={this.props.epochProgress || 0}
          />
          <Typography variant="body1" gutterBottom className="progressText">
            Batch: {this.props.currentBatch} / {this.props.stepsPerEpoch}
          </Typography>
          <LinearProgress
            className="progressBar"
            variant="determinate"
            value={this.props.batchProgress || 0}
            color="secondary"
          />
        </div>
      </div>
    );
  }
}

class ServerOutput extends Component {
  render() {
    return (
      <div className="codeBlock">
        <code>
          <pre>{this.props.output || 'No current output'}</pre>
        </code>
      </div>
    );
  }
}

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
          epochProgress: ((progress.curr_epoch + 1) / progress.max_epoch) * 100,
          batchProgress:
            ((progress.curr_batch + 1) / progress.steps_per_epoch) * 100,
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
    return (
      <div className={this.props.className}>
        <Tabs
          value={this.state.tab}
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
        <SwipeableViews index={this.state.tab}>
          <TabPanel value={this.state.tab} index={0}>
            <TrainingStatus
              postStopFlag={this.props.postStopFlag}
              onStop={this.handleStop}
              steps={this.props.steps}
              running={this.state.running}
              currentEpoch={this.state.currentEpoch}
              maxEpoch={this.state.maxEpoch}
              currentBatch={this.state.currentBatch}
              stepsPerEpoch={this.state.stepsPerEpoch}
            />
            <PredictProgress className="progress" />
          </TabPanel>
          <TabPanel value={this.state.tab} index={1}>
            <ServerOutput output={this.state.stdout} />
          </TabPanel>
          <TabPanel value={this.state.tab} index={2}>
            <ServerOutput output={this.state.stderr} />
          </TabPanel>
        </SwipeableViews>
      </div>
    );
  }
}

export default ModelProgress;

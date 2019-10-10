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
import withStyles from '@material-ui/core/styles/withStyles';
import CircularProgress from '@material-ui/core/CircularProgress';
import PredictProgress from './PredictProgress';

import './ModelProgress.css';

const styles = () => {};

class ModelProgress extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
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

  ServerOutput = output => {
    return (
      <div className="codeBlock">
        <code>
          <pre>{output || 'No current output'}</pre>
        </code>
      </div>
    );
  };

  TabPanel = (props, value, index, children) => {
    return (
      <Typography
        component="div"
        role="tabpanel"
        hidden={value !== index}
        id={`full-width-tabpanel-${index}`}
        aria-labelledby={`full-width-tab-${index}`}
      >
        <Box p={3}>{children}</Box>
      </Typography>
    );
  };

  TrainingStatus = () => {
    const {
      terminateTraining,
      checkReady,
      stopTraining,
      resetTraining,
      startTraining
    } = this.props;

    const {
      currentEpoch,
      stepsPerEpoch,
      maxEpoch,
      currentBatch,
      batchProgress,
      epochProgress,
      trainStatus,
      serverStatus
    } = this.state;

    return (
      <>
        <Paper square elevation={0} className="resetContainer">
          <div>
            <Typography
              hidden={this.getButtonStatus() === 0}
              variant="subtitle1"
            >
              Step 1/2
            </Typography>
            <Typography
              hidden={this.getButtonStatus() !== 0}
              variant="subtitle1"
            >
             {serverStatus === 'running' ? 'Training process starting...' : 'Not currently training.' }
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              {trainStatus === 1 && 'Model has started training...'}
              {trainStatus === 2 && 'Model has finished training.'}
            </Typography>
          </div>
          <div hidden={this.getButtonStatus() !== 0}>
            <Button
              onClick={startTraining}
              variant="contained"
              color="secondary"
              disabled={!checkReady() || serverStatus !== 'stopped'}
            >
              <span hidden={serverStatus !== 'stopped'}>
                Start Training
              </span>
              <span hidden={serverStatus !== 'pending'}>
                <CircularProgress size={17} style={{position: 'relative', top: '5px', marginRight: '10px'}}/>
                Starting...
              </span>
              <span hidden={serverStatus !== 'running'}>
                Waiting...
              </span>
              <span hidden={serverStatus !== 'stopping'}>
                Stopping...
              </span>
            </Button>
          </div>
          <div hidden={this.getButtonStatus() !== 1}>
            <Button
              onClick={stopTraining}
              variant="contained"
              className="stopButton"
            >
              <span hidden={serverStatus !== 'running'}>
                Stop Training
              </span>
              <span hidden={serverStatus !== 'stopping'}>
                <CircularProgress size={20} style={{position: 'relative', top: '5px', marginRight: '10px'}}/>
                Stopping...
              </span>
              <span hidden={serverStatus !== 'stopped'}>
                Stopped
              </span>
            </Button>
            <Button
              onClick={terminateTraining}
              variant="contained"
              className="terminateButton"
            >
              Terminate
            </Button>
          </div>
          <div hidden={this.getButtonStatus() !== 2}>
            <Button onClick={resetTraining} variant="contained" color="primary">
              Reset Training
            </Button>
          </div>
        </Paper>
        <div className="progressBars" hidden={trainStatus === 0}>
          <Typography variant="body1" gutterBottom className="progressText">
            Epoch: {currentEpoch} / {maxEpoch}
          </Typography>
          <LinearProgress
            className="progressBar"
            variant="determinate"
            value={epochProgress || 0}
          />
          <Typography variant="body1" gutterBottom className="progressText">
            Batch: {currentBatch} / {stepsPerEpoch}
          </Typography>
          <LinearProgress
            className="progressBar"
            variant="determinate"
            value={batchProgress || 0}
            color="secondary"
          />
        </div>
      </>
    );
  };

  loadStdOut = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .get(`/api/models/train/stdout`, config)
      .then(res => {
        this.setState({
          stdout: res.data
        });
      })
      .catch(error => {
        console.log(error);
      });
  }

  loadStdErr = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .get(`/api/models/train/stderr`, config)
      .then(res => {
        this.setState({
          stderr: res.data
        });
      })
      .catch(error => {
        console.log(error);
      });
    }

  loadProgressInfoTrain = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .get(`/api/models/progress/train`, config)
      .then(res => {
        const progress = res.data;

        this.setState({
          currentEpoch: progress.curr_epoch + 1,
          currentBatch: progress.curr_batch + 1,
          maxEpoch: progress.max_epoch,
          stepsPerEpoch: progress.steps_per_epoch,
          epochProgress: ((progress.curr_epoch + 1) / progress.max_epoch) * 100,
          batchProgress:
            ((progress.curr_batch + 1) / progress.steps_per_epoch) * 100,
          trainStatus: progress.status
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
    this.setState({ tab: newValue });
    if (newValue === 1){
      this.loadStdOut();
    }
    else if (newValue === 2){
      this.loadStdErr();
    }
  };

  loadProgressInfoPredict = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    try {
      const predictions = await axios.get(
        `/api/models/progress/predict`,
        config
      );
      const predictionsData = predictions.data;
      if (predictionsData === 'not loaded') {
        this.setState({
          loaded: false
        });
        return;
      }

      const totalVideos = predictionsData.total_videos;
      const currentVideoNum = predictionsData.current_video;
      const totalFrames = predictionsData.totalframe;
      const currentFrame = predictionsData.framenum;
      const predictStatus = predictionsData.status;
      const videoProgress = (currentVideoNum / totalVideos) * 100;
      const predictionProgress = (currentFrame / totalFrames) * 100;
      const videoId = predictionsData.videoid;

      this.setState({
        loaded: true,
        totalVideos,
        currentVideoNum,
        currentFrame,
        totalFrames,
        predictStatus,
        videoProgress,
        predictionProgress,
        videoId
      });
    } catch (error) {
      console.log(error);
    }
  };

  getButtonStatus = () => {
    const { trainStatus, predictStatus } = this.state;
    if (trainStatus === 0) {
      return 0;
    }
    if (predictStatus === 4) {
      return 2;
    }
    return 1;
  };

  loadProgressInfo() {
    this.getInstanceStatus();
    this.loadProgressInfoTrain();
    this.loadProgressInfoPredict();
  }

  getInstanceStatus = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    try {
      axios.get(`/api/models/instance/status`, config).then(res => {
        this.setState({ serverStatus: res.data });
      });
    } catch (error) {
      console.log(error);
    }
  }


  render() {
    const { className } = this.props;
    const {
      loaded,
      tab,
      currentVideoNum,
      totalVideos,
      currentFrame,
      totalFrames,
      videoProgress,
      predictionProgress,
      predictStatus,
      stdout,
      stderr,
      videoId
    } = this.state;

    return (
      <div className={className}>
        <Tabs
          value={tab}
          variant="fullWidth"
          indicatorColor="secondary"
          textColor="secondary"
          onChange={this.handleChange}
          className="tabs"
        >
          <Tab label="Training Status" />
          <Tab label="Standard Output" />
          <Tab label="Standard Error" />
        </Tabs>
        <SwipeableViews index={tab}>
          {this.TabPanel(
            this.props,
            tab,
            0,
            <div>
              {this.TrainingStatus()}
              {loaded ? (
                <PredictProgress
                  className="progress"
                  currentVideoNum={currentVideoNum}
                  totalVideos={totalVideos}
                  currentFrame={currentFrame}
                  totalFrames={totalFrames}
                  videoProgress={videoProgress}
                  predictionProgress={predictionProgress}
                  status={predictStatus}
                  videoId={videoId}
                />
              ) : (
                ''
              )}
            </div>
          )}
          {this.TabPanel(this.props, tab, 1, this.ServerOutput(stdout))}
          {this.TabPanel(this.props, tab, 2, this.ServerOutput(stderr))}
        </SwipeableViews>
      </div>
    );
  }
}

export default withStyles(styles)(ModelProgress);

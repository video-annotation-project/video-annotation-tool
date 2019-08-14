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
            <Typography 
              hidden={this.props.buttonStatus === 0} 
              variant="subtitle1">
                Step 1/2
            </Typography>
            <Typography 
              hidden={this.props.buttonStatus !== 0} 
              variant="subtitle1">
                Not currently training.
            </Typography>  
            <Typography variant="subtitle2" gutterBottom>
              {this.props.status === 1 && 'Model has started training...'}
              {this.props.status === 2 && 'Model has finished training.'}
            </Typography>
          </div>
            <div hidden={this.props.buttonStatus !== 0}>
            <Button
              onClick={this.props.startTraining}
              variant="contained"
              color="primary"
              disabled={!this.props.ready}
            >
              Start Training
            </Button>
          </div>
          <div hidden={this.props.buttonStatus !== 1}>
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
          <div hidden={this.props.buttonStatus !== 2}>
            <Button
              onClick={this.props.postStopFlag}
              variant="contained"
              color="primary"
            >
              Reset Training
            </Button>
          </div>
        </Paper>
        <div className="progressBars"  hidden={this.props.status === 0}>
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
      status: null,
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

  loadProgressInfo(){
    this.loadProgressInfoTrain();
    this.loadProgressInfoPredict();
  }

  loadProgressInfoTrain = () => {
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
        let running = false;
        if (progress.status === 1) {
          running = true;
        }

        this.setState({
          currentEpoch: progress.curr_epoch + 1,
          currentBatch: progress.curr_batch + 1,
          maxEpoch: progress.max_epoch,
          stepsPerEpoch: progress.steps_per_epoch,
          epochProgress: ((progress.curr_epoch + 1) / progress.max_epoch) * 100,
          batchProgress:
            ((progress.curr_batch + 1) / progress.steps_per_epoch) * 100,
          stdout: progress.std_out,
          stderr: progress.std_err,
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
      const totalVideos = predictionsData.length;
      const currentVideo = predictionsData.currentVideo;
      const totalFrames = currentVideo.totalframe;
      const currentVideoNum = currentVideo.videoNum;
      const currentFrame = currentVideo.framenum;
      const predictStatus = currentVideo.status;
      const videoProgress = (currentVideo.videoNum / totalVideos) * 100;
      const predictionProgress = (currentFrame / totalFrames) * 100;

      this.setState({
        totalVideos,
        currentVideoNum,
        currentFrame,
        totalFrames,
        predictStatus,
        videoProgress,
        predictionProgress,
      });
    } catch (error) {
      console.log(error);
    }
  };

  getButtonStatus = () => {
    if (this.state.trainStatus === 0){
      return 0;
    } else if (this.state.predictStatus === 4){
      return 2;
    }
    return 1;
  }

  render() {
    const { className, steps } = this.props;
    const {
      tab,
      running,
      currentEpoch,
      maxEpoch,
      epochProgress,
      batchProgress,
      currentBatch,
      stepsPerEpoch,
      stdout,
      stderr,
      status
    } = this.state;

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
              steps={this.state.steps}
              running={this.state.running}
              currentEpoch={this.state.currentEpoch}
              maxEpoch={this.state.maxEpoch}
              currentBatch={this.state.currentBatch}
              stepsPerEpoch={this.state.stepsPerEpoch}
              epochProgress={this.state.epochProgress}
              batchProgress={this.state.batchProgress}
              status={this.state.trainStatus}
              buttonStatus={this.getButtonStatus()}
              startTraining={this.props.startTraining}
              ready={this.props.ready}
            />
            <PredictProgress 
              className="progress" 
              currentVideoNum={this.state.currentVideoNum}
              totalVideos={this.state.totalVideos}
              currentFrame={this.state.currentFrame}
              totalFrames={this.state.totalFrames}
              videoProgress={this.state.videoProgress}
              predictionProgress={this.state.predictionProgress}
              status={this.state.predictStatus}
            />
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

import React, { Component } from 'react';
import axios from 'axios';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Typography } from '@material-ui/core';

import './ModelProgress.css';

function PredictingStatus(props) {
  const {
    currentVideoNum,
    totalVideos,
    videoProgress,
    stage,
    currentFrame,
    totalFrames,
    predictionProgress
  } = props;

  return (
    <div className="progressBars">
      <Typography variant="body1" gutterBottom className="progressText">
        Video: {currentVideoNum} / {totalVideos}
      </Typography>
      <LinearProgress
        className="progressBar"
        variant="determinate"
        value={videoProgress}
      />
      <Typography variant="body1" gutterBottom className="progressText">
        {stage} frame {currentFrame} of {totalFrames}
      </Typography>
      <LinearProgress
        className="progressBar"
        variant="determinate"
        value={predictionProgress}
        color="secondary"
      />
    </div>
  );
}

class PredictProgress extends Component {
  constructor(props) {
    super(props);

    this.state = {
      running: false
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

  loadProgressInfo = async () => {
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
      if (predictions) {
        const predictionsData = predictions.data;
        const totalVideos = predictionsData.length;
        const currentVideo = this.getCurrentVideo(predictionsData);
        const currentVideoNum = currentVideo.videoNum;
        const currentFrame = currentVideo.framenum;
        const totalFrames = currentVideo.totalframe;
        const { status } = currentVideo;
        const videoProgress = (currentVideo.videoNum / totalVideos) * 100;
        const predictionProgress = (currentFrame / totalFrames) * 100;

        if (totalVideos === 0) {
          this.setState({
            running: false
          });
        } else {
          this.setState({
            totalVideos,
            currentVideoNum,
            currentFrame,
            totalFrames,
            status,
            videoProgress,
            predictionProgress,
            running: true
          });
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  getCurrentVideo = predictions => {
    let currentVideo = predictions.find((pred, index) => {
      if (pred.framenum !== pred.totalframe) {
        pred.videoNum = index + 1;
      }
      return pred;
    });

    if (currentVideo) {
      return currentVideo;
    }

    currentVideo = predictions[predictions.length - 1];
    currentVideo.videoNum = predictions.length;
    return currentVideo;
  };

  getStatus = status => {
    if (status === 0) {
      return 'Resizing';
    }
    if (status === 1) {
      return 'Predicting';
    }
    if (status === 2) {
      return 'Generating';
    }
    return '';
  };

  getProgress = (framenum, totalframe) => {
    // var progress = (status * (100 / totalSteps)) + (framenum / totalframe) * (100 / totalSteps);
    const progress = (framenum / totalframe) * 100;
    return progress;
  };

  render() {
    const {
      running,
      currentVideoNum,
      totalVideos,
      currentFrame,
      totalFrames,
      status,
      videoProgress,
      predictionProgress
    } = this.state;

    if (running === false) {
      return <div> </div>;
    }

    return (
      <div className="predictProgress">
        <div>
          <Typography variant="subtitle1">Step 2/2</Typography>
          <Typography variant="subtitle2" gutterBottom>
            Model has started predicting...
          </Typography>
        </div>
        <PredictingStatus
          currentVideoNum={currentVideoNum}
          totalVideos={totalVideos}
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          stage={this.getStatus(status)}
          videoProgress={videoProgress}
          predictionProgress={predictionProgress}
        />
      </div>
    );
  }
}

export default PredictProgress;

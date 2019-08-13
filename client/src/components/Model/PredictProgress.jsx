import React, { Component } from 'react';
import axios from 'axios';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Typography } from '@material-ui/core';

import './ModelProgress.css'

class PredictingStatus extends Component {
  render(){

    return (
      <div className='progressBars'>
        <Typography
          variant="body1"
          gutterBottom
          className='progressText'
        >
          Video: {this.props.currentVideoNum} / {this.props.totalVideos}
        </Typography>
        <LinearProgress
          className='progressBar'
          variant="determinate"
          value={this.props.videoProgress || 0}
        />
        <Typography
          variant="body1"
          gutterBottom
          className='progressText'
        >
          {this.props.stage} frame {this.props.currentFrame} of {this.props.totalFrames}
        </Typography>
        <LinearProgress
          className='progressBar'
          variant="determinate"
          value={this.props.predictionProgress || 0}
          color="secondary"
        />
      </div>
    )
  }
}

class PredictProgress extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="predictProgress" hidden={this.props.status === 0} >
        <div>
          <Typography variant="subtitle1">Step 2/2</Typography>
          <Typography variant="subtitle2" gutterBottom>
            {this.props.status === 1 && 'Currently resizing vidoes...'}
            {this.props.status === 2 && 'Currently predicting videos...'}
            {this.props.status === 3 && 'Currently generating videos...'}
            {this.props.status === 4 && 'Model has finished predicting.'}
          </Typography>
        </div>
        <PredictingStatus
          currentVideoNum={this.props.currentVideoNum}
          totalVideos={this.props.totalVideos}
          currentFrame={this.props.currentFrame}
          totalFrames={this.props.totalFrames}
          videoProgress={this.props.videoProgress}
          predictionProgress={this.props.predictionProgress}
        />
      </div>
    );
  }
}

export default PredictProgress;

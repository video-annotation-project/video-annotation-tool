import React from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Typography } from '@material-ui/core';

import './ModelProgress.css';

function PredictingStatus(props) {
  const {
    currentVideoNum,
    totalVideos,
    videoProgress,
    stage,
    totalFrames,
    currentFrame,
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
        value={videoProgress || 0}
      />
      <Typography variant="body1" gutterBottom className="progressText">
        {stage} frame {currentFrame} of {totalFrames}
      </Typography>
      <LinearProgress
        className="progressBar"
        variant="determinate"
        value={predictionProgress || 0}
        color="secondary"
      />
    </div>
  );
}

function PredictProgress(props) {
  const {
    status,
    currentVideoNum,
    totalVideos,
    currentFrame,
    totalFrames,
    videoProgress,
    predictionProgress,
    videoId,
    predictOnly
  } = props;

  return (
    <div className="predictProgress" hidden={status === 0}>
      <div>
        {predictOnly ? (
          ' '
        ) : (
          <Typography variant="subtitle1">Step 2/2</Typography>
        )}
        <Typography variant="subtitle2" gutterBottom>
          {status === 1 && `Currently resizing video ${videoId}...`}
          {status === 2 && `Currently predicting video ${videoId}...`}
          {status === 3 && `Currently generating video ${videoId}...`}
          {status === 4 && `Model has finished predicting.`}
        </Typography>
      </div>
      <PredictingStatus
        currentVideoNum={currentVideoNum}
        totalVideos={totalVideos}
        currentFrame={currentFrame}
        totalFrames={totalFrames}
        videoProgress={videoProgress}
        predictionProgress={predictionProgress}
      />
    </div>
  );
}

export default PredictProgress;

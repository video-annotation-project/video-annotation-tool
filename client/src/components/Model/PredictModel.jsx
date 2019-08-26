import React, { Component } from 'react';
import axios from 'axios';
import Input from '@material-ui/core/Input';
import { FormControl, Paper } from '@material-ui/core';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import PredictProgress from './PredictProgress';
import Swal from 'sweetalert2/src/sweetalert2';

import './TrainModel.css';

const styles = theme => ({
  switches: {
    marginTop: theme.spacing()
  },
  options: {
    marginLeft: theme.spacing(1.5),
    marginRight: theme.spacing(1.5)
  }
});

const paramFields = ['modelSelected', 'selectedVideos'];

function ModelsForm(props) {
  const { className, modelSelected, handleChange, models } = props;
  return (
    <FormControl component="fieldset" className={className}>
      <InputLabel shrink>Model</InputLabel>
      <Select
        name="modelSelected"
        value={modelSelected || 'Loading...'}
        onChange={handleChange}
      >
        {models.map(model => (
          <MenuItem key={model.name} value={model}>
            {model.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function VideoForm(props) {
  const { className, selectedVideos, onChange, videos } = props;
  return (
    <FormControl component="fieldset" className={className}>
      <InputLabel shrink>Videos</InputLabel>
      <Select
        multiple
        name="selectedVideos"
        value={selectedVideos}
        onChange={onChange}
        input={<Input id="select-multiple" />}
        renderValue={selected =>
          selected.map(videoSelected => videoSelected.filename).join(', ') ||
          'Loading...'
        }
      >
        {videos.map(video => (
          <MenuItem key={video.id} value={video}>
            <Checkbox checked={selectedVideos.indexOf(video) > -1} />
            <ListItemText>{video.id + '. ' + video.filename}</ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

class PredictModel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      models: [],
      modelSelected: undefined,
      videos: [],
      selectedVideos: [],
      videoSelected: '',
      users: [],
      userSelected: '',
      activeStep: 0,
      openedVideo: null,
      ready: false,
      postAnnotation: false,
      loaded: false
    };
  }

  componentDidMount = async () => {
    await this.loadExistingModels();
    await this.loadVideoList();
    this.interval = setInterval(() => this.loadProgressInfoPredict(), 500);
  };

  checkReady = () => {
    const { state } = this;

    const notReady = paramFields.find(key => {
      return (
        !Object.prototype.hasOwnProperty.call(state, key) ||
        state[key] === null ||
        state[key] === undefined ||
        (Array.isArray(state[key]) && state[key].length === 0) ||
        state[key] === ''
      );
    });

    return !notReady;
  };

  loadExistingModels = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios
      .get(`/api/models?predict=true`, config)
      .then(res => {
        this.setState({
          models: res.data
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

  loadVideoList = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios.get(`/api/videos`, config).then(res => {
      const { unwatchedVideos, watchedVideos, inProgressVideos } = res.data;
      const videos = unwatchedVideos.concat(watchedVideos, inProgressVideos);
      this.setState({
        videos
      });
    });
  };

  handleSelect = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  updateBackendInfo = async () => {
    const { modelSelected, postAnnotation, selectedVideos } = this.state;
    let vidArray = [];
    selectedVideos.forEach(video => {
      vidArray.push(video.id);
    });
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      model: modelSelected.name,
      uploadAnnotations: postAnnotation,
      concepts: modelSelected.concepts,
      videos: vidArray,
      userid: modelSelected.userid
    };

    try {
      let res = await axios.put(
        `/api/models/train?predictmodel=true`,
        body,
        config
      );
      console.log(res);
      if (res.data[0].userid === modelSelected.userid) {
        Swal.fire(`Started Predicting with ${body.model}`, '', 'success');
      }
    } catch (error) {
      console.log(error);
    }
  };

  startTraining = async () => {
    try {
      await this.updateBackendInfo();
    } catch (error) {
      console.log(error);
    }
    this.postModelInstance();
  };

  handleChange = event => {
    event.persist();
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  handleChangeSwitch = event => {
    event.persist();
    this.setState({
      [event.target.value]: event.target.checked
    });
  };

  handleChangeMultiple = event => {
    const options = event.target.value;
    const value = [];
    for (let i = 0, l = options.length; i < l; i += 1) {
      value.push(options[i]);
    }
    this.setState({
      selectedVideos: value
    });
  };

  postModelInstance = command => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      command,
      modelInstanceId: 'i-0f2287cb0fc621b6d'
    };
    axios.post(`/api/models/train`, body, config).then(res => {
      console.log(res);
    });
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

  render() {
    const { classes } = this.props;
    const {
      modelSelected,
      models,
      selectedVideos,
      videos,
      postAnnotation,
      loaded,
      currentVideoNum,
      totalVideos,
      currentFrame,
      totalFrames,
      videoProgress,
      predictionProgress,
      predictStatus,
      videoId
    } = this.state;

    return (
      <div className="root">
        <Paper>
          <div className="container">
            <div className="actionsContainer">
              <ModelsForm
                className="modelsForm"
                modelSelected={modelSelected}
                handleChange={this.handleChange}
                models={models}
              />
              <VideoForm
                className="collectionsForm"
                videos={videos}
                selectedVideos={selectedVideos}
                onChange={this.handleChangeMultiple}
              />
            </div>

            <div className={classes.options}>
              <div className={classes.switches}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={postAnnotation}
                      onChange={this.handleChangeSwitch}
                      value="postAnnotation"
                      color="primary"
                    />
                  }
                  label="Post Annotations"
                />
                {/* <Button
                  onClick={this.startTraining}
                  variant="contained"
                  color="secondary"
                >
                  Start Training
                </Button> */}
                <Button
                  style={{ float: 'right' }}
                  className={loaded ? 'terminateButton' : ''}
                  onClick={
                    loaded
                      ? () => this.postModelInstance('stop')
                      : this.startTraining
                  }
                  variant="contained"
                  color="secondary"
                  disabled={!this.checkReady()}
                >
                  {loaded ? 'Stop Predicting' : 'Start Predicting'}
                </Button>
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
                    predictOnly={true}
                  />
                ) : (
                  ''
                )}
              </div>
            </div>
            <Divider style={{ marginTop: '30px' }} variant="middle" />
          </div>
        </Paper>
      </div>
    );
  }
}

export default withStyles(styles)(PredictModel);

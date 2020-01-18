import React, { Component } from 'react';
import axios from 'axios';

import { withStyles } from '@material-ui/core/styles';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Table from '@material-ui/core/Table';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import Description from '@material-ui/icons/Description';
import { Typography, Button } from '@material-ui/core';
import AssessmentIcon from '@material-ui/icons/Assessment';

import GeneralMenu from '../Utilities/GeneralMenu';
import AIvideos from './AIvideos';
import TrainModel from './TrainModel';
import PredictModel from './PredictModel';
import ModelTreeView from '../Utilities/ModelTreeView';

const CustomTableCell = withStyles(theme => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontSize: 14
  },
  body: {
    fontSize: 14
  }
}))(TableCell);

class ModelsTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modelSelected: '',
      anchorEl: null,
      train: { status: '', param: '' },
      predict: { status: '', param: '' }
    };
  }

  componentDidMount() {
    this.getStatus();
    this.interval = setInterval(() => this.getStatus(), 5000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  videosGetter(model) {
    if (!model.videos) return null;
    let item = model.videos.find(
      version => version.version === model.version_selected.toString()
    );
    if (item) {
      return item.videos;
    } else {
      return null;
    }
  }

  getStatus = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    try {
      let res = await axios.get(
        `/api/models/progress/status/i-011660b3e976035d8?train=true`,
        config
      );
      let res1 = await axios.get(
        `/api/models/progress/status/i-0f2287cb0fc621b6d?train=false`,
        config
      );
      this.setState({
        train: res.data,
        predict: res1.data
      });
    } catch (err) {
      console.log(err);
    }
  };

  render = () => {
    const {
      models,
      handleSelectVersion,
      handleOpenInfo,
      deleteModel,
      formatDate,
      handleClickVideo,
      videoModalOpen,
      toggleStateVariable,
      currentVideo,
      trainOpen,
      predictOpen,
      launchTensorboard
    } = this.props;
    const { modelSelected, train, predict } = this.state;
    if (!models) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    return (
      <div>
        {train.status ? (
          <Typography
            variant="button"
            display="block"
            gutterBottom={true}
            style={{ float: 'right' }}
          >
            Train Instance: <font color="orange">{train.status}</font> Predict
            Instance: <font color="orange">{predict.status}</font>
          </Typography>
        ) : (
          ''
        )}
        <Table>
          <TableHead>
            <TableRow>
              <CustomTableCell>Name</CustomTableCell>
              <CustomTableCell>Versions #</CustomTableCell>
              <CustomTableCell>Date Created</CustomTableCell>
              <CustomTableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {models.map(model => (
              <TableRow key={model.name}>
                <CustomTableCell component="th" scope="row">
                  {model.name}
                </CustomTableCell>
                <CustomTableCell>
                  <ModelTreeView
                    model={model}
                    toggleStateVariable={toggleStateVariable}
                    handleSelectVersion={handleSelectVersion}
                  />
                  <Typography
                    align="center"
                    variant="subtitle2"
                    color="secondary"
                  >
                    Selected: {model.version_selected}
                  </Typography>
                </CustomTableCell>
                <CustomTableCell>{formatDate(model.timestamp)}</CustomTableCell>
                <CustomTableCell align="right">
                  <IconButton
                    onClick={() => handleOpenInfo(model)}
                    aria-label="Description"
                  >
                    <Description />
                  </IconButton>
                  <IconButton
                    disabled={!model.start_trains[model.version_selected]}
                    onClick={() =>
                      launchTensorboard(
                        model.name + '-' + model.version_selected
                      )
                    }
                    aria-label="Assessment"
                  >
                    <AssessmentIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => deleteModel(model)}
                    aria-label="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                  <GeneralMenu
                    disabled
                    name="AiVideos"
                    variant="contained"
                    color="primary"
                    Link={false}
                    handleInsert={handleClickVideo}
                    items={this.videosGetter(model)}
                    aivideos={true}
                  />
                  <Button
                    disabled={
                      train.status !== 'stopped'
                        ? model.name !== train.param
                        : false
                    }
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      this.setState(
                        {
                          modelSelected: model
                        },
                        toggleStateVariable(true, 'trainOpen')
                      );
                    }}
                  >
                    Train
                  </Button>
                  <Button
                    disabled={
                      (predict.status !== 'stopped'
                        ? model.name !== predict.param
                        : false) || model.version_selected.toString() === '0'
                    }
                    style={{ marginLeft: '10px' }}
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      this.setState(
                        {
                          modelSelected: model
                        },
                        toggleStateVariable(true, 'predictOpen')
                      );
                    }}
                  >
                    Predict
                  </Button>
                </CustomTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {trainOpen ? (
          <TrainModel
            status={train}
            trainOpen={trainOpen}
            toggleStateVariable={toggleStateVariable}
            model={modelSelected}
          />
        ) : (
          ''
        )}
        {predictOpen ? (
          <PredictModel
            status={predict}
            predictOpen={predictOpen}
            toggleStateVariable={toggleStateVariable}
            model={modelSelected}
          />
        ) : (
          ''
        )}
        {videoModalOpen ? (
          <AIvideos
            videoModalOpen={videoModalOpen}
            toggleStateVariable={toggleStateVariable}
            // testing={true}
            video={currentVideo}
          />
        ) : (
          ''
        )}
      </div>
    );
  };
}

export default ModelsTable;

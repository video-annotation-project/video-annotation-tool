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
import FormControl from '@material-ui/core/FormControl';

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
      anchorEl: null
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
      let res = await axios.get(`/api/models/progress/status`, config);
      this.setState(res.data);
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
      versionOpen
    } = this.props;
    const {
      modelSelected,
      anchorEl,
      train,
      predict,
      modelClicked
    } = this.state;
    if (!models) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    return (
      <div>
        <Table>
          <TableHead>
            <TableRow>
              <CustomTableCell>Name</CustomTableCell>
              <CustomTableCell>Versions #</CustomTableCell>
              {/* <CustomTableCell>New Versions</CustomTableCell> */}
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
                {/* <CustomTableCell>
                  <FormControl>
                    <Select
                      value={model.version_selected}
                      renderValue={value => `${parseInt(value) + 1}`}
                      onChange={event => handleSelectVersion(event, model)}
                    >
                      {model.runs.map((version, index) => (
                        <MenuItem key={version.id} value={index}>
                          {index + 1 + ' : ' + formatDate(version.time)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CustomTableCell> */}
                <CustomTableCell>
                  <FormControl>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={e => {
                        this.setState(
                          {
                            anchorEl: e.currentTarget,
                            modelClicked: model
                          },
                          toggleStateVariable(true, 'versionOpen')
                        );
                      }}
                    >
                      {model.version_selected}
                    </Button>
                  </FormControl>
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
                    disabled={train ? model.name !== train.model : false}
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
                      (predict ? model.name !== predict.model : false) ||
                      model.version_selected === 0
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
        <ModelTreeView
          anchorEl={anchorEl}
          model={modelClicked}
          open={versionOpen}
          toggleStateVariable={toggleStateVariable}
          handleSelectVersion={handleSelectVersion}
        />
        <TrainModel
          trainOpen={trainOpen}
          toggleStateVariable={toggleStateVariable}
          model={modelSelected}
        />
        <PredictModel
          predictOpen={predictOpen}
          toggleStateVariable={toggleStateVariable}
          model={modelSelected}
        />
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

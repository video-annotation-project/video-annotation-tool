import React, { Component } from 'react';
import axios from 'axios';

import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
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
      predict: { status: '', param: '' },
      order: 'desc',
      orderBy: 'timestamp'
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

  // Sorting functions

  desc(a, b, orderBy) {
    if (b[orderBy].toLowerCase() < a[orderBy].toLowerCase()) {
      return -1;
    }
    if (b[orderBy].toLowerCase() > a[orderBy].toLowerCase()) {
      return 1;
    }
    return 0;
  }

  stableSort(array, cmp) {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = cmp(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map(el => el[0]);
  }

  getSorting(order, orderBy) {
    return order === 'desc'
      ? (a, b) => this.desc(a, b, orderBy)
      : (a, b) => -this.desc(a, b, orderBy);
  }

  handleRequestSort = (event, property) => {
    const { order, orderBy } = this.state;
    const isAsc = orderBy === property && order === 'asc';
    this.setOrder(isAsc ? 'desc' : 'asc');
    this.setOrderBy(property);
  };

  createSortHandler = property => event => {
    this.handleRequestSort(event, property);
  };

  setOrder = order => {
    this.setState({ order });
  };

  setOrderBy = orderBy => {
    this.setState({ orderBy });
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
    const { modelSelected, train, predict, order, orderBy } = this.state;

    if (!models) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }

    return (
      <div>
        <Table>
          <TableHead>
            <TableRow>
              <CustomTableCell
                sortDirection={orderBy === 'name' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={this.createSortHandler('name')}
                >
                  Name
                </TableSortLabel>
              </CustomTableCell>
              <CustomTableCell>Version #</CustomTableCell>
              <CustomTableCell
                sortDirection={orderBy === 'timestamp' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'timestamp'}
                  direction={orderBy === 'timestamp' ? order : 'asc'}
                  onClick={this.createSortHandler('timestamp')}
                >
                  Date Created
                </TableSortLabel>
              </CustomTableCell>
              <CustomTableCell>
                {train.status ? (
                  <>
                    <Typography variant="button" style={{ float: 'right' }}>
                      Predict Instance:{' '}
                      <font color="orange">{predict.status}</font>
                    </Typography>
                    <Typography
                      variant="button"
                      style={{ marginRight: '20px', float: 'right' }}
                    >
                      Train Instance: <font color="orange">{train.status}</font>
                    </Typography>
                  </>
                ) : (
                  ''
                )}
              </CustomTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {this.stableSort(models, this.getSorting(order, orderBy)).map(
              model => (
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
                  <CustomTableCell>
                    {formatDate(model.timestamp)}
                  </CustomTableCell>
                  <CustomTableCell align="right">
                    <IconButton
                      onClick={() => handleOpenInfo(model)}
                      aria-label="Description"
                    >
                      <Description />
                    </IconButton>
                    <IconButton
                      disabled={
                        !model.version_selected ||
                        model.version_selected === '0' ||
                        !model.start_trains[model.version_selected]
                      }
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
              )
            )}
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

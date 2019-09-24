import React, { Component } from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Table from '@material-ui/core/Table';
import Swal from 'sweetalert2/src/sweetalert2';
import { Typography, Button } from '@material-ui/core';

import AIvideos from '../AIVideos/AIvideos';
import GeneralMenu from '../Utilities/GeneralMenu';
import Dialog from '@material-ui/core/Dialog';
import TableCell from '@material-ui/core/TableCell';

import ModelsTable from './ModelsTable';

const styles = theme => ({
  root: {
    margins: 'auto',
    padding: '20px 12%'
  }
});

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

class Models extends Component {
  constructor(props) {
    super(props);
    this.state = {
      models: [],
      videoModalOpen: false,
      infoOpen: false,
      selectedModel: ''
    };
  }

  componentDidMount = () => {
    this.loadVideos();
    this.loadExistingModels();
  };

  loadVideos = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios
      .get('/api/videos/aivideos/1', config)
      .then(res => this.setState({ aiVideos: res.data.rows }))
      .catch(error => console.log(error));
  };

  loadExistingModels = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .get(`/api/models`, config)
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

  handleCloseInfo = () => {
    this.setState({
      infoOpen: false
    });
  };

  handleOpenInfo = model => {
    this.setState({
      infoOpen: true,
      selectedModel: model
    });
  };

  deleteModel = async model => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: {
        model
      }
    };
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async result => {
      if (result.value) {
        try {
          await axios.delete('/api/models', config);
          Swal.fire('Deleted!', 'Video has been deleted.', 'success');
          this.loadExistingModels();
        } catch (error) {
          Swal.fire(error, '', 'error');
        }
      }
    });
  };

  toggleAiVideos = condition => {
    this.setState({
      videoModalOpen: condition
    });
  };

  handleExpand = model => {
    console.log(model);
  handleSelectVersion = (event, model) => {
    const { models } = this.state;
    let selectedModel = models.find(m => m.name === model.name);
    selectedModel.version_selected = event.target.value;

    this.setState({ models });
  };

  handleClick = async id => {
    const { aiVideos } = this.state;
    await this.setState({
      videoModalOpen: true,
      currentVideo: await aiVideos.find(video => {
        return video.id === id;
      })
    });
  };

  render() {
    const { classes } = this.props;
    const { models, aiVideos, videoModalOpen, currentVideo, models, infoOpen, selectedModel } = this.state;
    console.log(aiVideos);
    if (!models) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    return (
      <div className={classes.root}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <CustomTableCell>Name</CustomTableCell>
              <CustomTableCell align="right">Date Created</CustomTableCell>
              <CustomTableCell>Concepts</CustomTableCell>
              <CustomTableCell>ConceptIDs</CustomTableCell>
              <CustomTableCell>Verification Videos</CustomTableCell>
              <CustomTableCell>Delete</CustomTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {models.map(model => (
              <TableRow key={model.name}>
                <CustomTableCell component="th" scope="row">
                  {model.name}
                </CustomTableCell>
                <CustomTableCell align="right">
                  {model.timestamp}
                </CustomTableCell>
                <CustomTableCell align="right">
                  {models[0].concepts.join(', ')}
                </CustomTableCell>
                <CustomTableCell align="right">
                  {model.conceptsid.toString()}
                </CustomTableCell>
                <CustomTableCell>
                  {model.verificationvideos
                    ? model.verificationvideos.toString()
                    : 'NON'}
                </CustomTableCell>
                <CustomTableCell>
                  <IconButton
                    onClick={() => this.deleteModel(model)}
                    aria-label="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CustomTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <GeneralMenu
          name="AiVideos"
          variant="contained"
          color="primary"
          handleInsert={this.handleClick}
          Link={false}
          items={aiVideos}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => this.toggleAiVideos(true)}
        >
          Ai1
        </Button>
        {videoModalOpen ? (
          <AIvideos
            videoModalOpen={videoModalOpen}
            toggleAiVideos={this.toggleAiVideos}
            // testing={true}
            video={currentVideo}
          />
        ) : (
          ''
        <ModelsTable
          models={models}
          handleSelectVersion={this.handleSelectVersion}
          handleOpenInfo={this.handleOpenInfo}
          deleteModel={this.deleteModel}
        />
        {infoOpen && (
          <Dialog onClose={this.handleCloseInfo} open={infoOpen}>
            <Table className={classes.table}>
              <TableHead>
                <TableRow>
                  <CustomTableCell>Concepts</CustomTableCell>
                  <CustomTableCell>ConceptIDs</CustomTableCell>
                  <CustomTableCell>Verification Videos</CustomTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <CustomTableCell align="right">
                    {selectedModel.concepts.join(', ')}
                  </CustomTableCell>
                  <CustomTableCell align="right">
                    {selectedModel.conceptsid.toString()}
                  </CustomTableCell>
                  <CustomTableCell>
                    {selectedModel.verificationvideos
                      ? selectedModel.verificationvideos.toString()
                      : 'NON'}
                  </CustomTableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Dialog>
        )}
      </div>
    );
  }
}

export default withStyles(styles)(Models);

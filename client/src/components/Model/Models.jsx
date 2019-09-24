import React, { Component } from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Table from '@material-ui/core/Table';
import Swal from 'sweetalert2/src/sweetalert2';
import DeleteIcon from '@material-ui/icons/Delete';
import IconButton from '@material-ui/core/IconButton';
import { Typography, Button } from '@material-ui/core';

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
  formatDate = version => {
    let d = new Date(version);
    return d.toUTCString().replace(' GMT', '');
  };

  componentDidMount = () => {
    this.loadExistingModels();
    // await this.loadVideos();
  };

  // loadVideos = () => {
  //   const { models } = this.state;
  //   const config = {
  //     headers: {
  //       Authorization: `Bearer ${localStorage.getItem('token')}`
  //     }
  //   };
  //   return axios
  //     .get('/api/videos/aivideos', config)
  //     .then(res => {
  //       let result = res.data.rows;
  //       this.setState({
  //         aiVideos: result
  //       });
  //     })
  //     .catch(error => console.log(error));
  // };

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

  handleSelectVersion = (event, model) => {
    const { models } = this.state;
    let selectedModel = models.find(m => m.name === model.name);

    selectedModel.version_selected = event.target.value;
    selectedModel.selectedId = selectedModel.runs[event.target.value].id;

    this.setState({ models });
  };

  handleClickVideo = async (id, videos) => {
    let currentVideo = await videos.find(video => video.id === id);
    this.setState({
      videoModalOpen: true,
      currentVideo
    });
  };

  render() {
    const { classes } = this.props;
    const {
      models,
      aiVideos,
      videoModalOpen,
      currentVideo,
      infoOpen,
      selectedModel
    } = this.state;

    if (!models) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    return (
      <div className={classes.root}>
        <ModelsTable
          models={models}
          aiVideos={aiVideos}
          handleSelectVersion={this.handleSelectVersion}
          handleOpenInfo={this.handleOpenInfo}
          deleteModel={this.deleteModel}
          aiEnable={this.aiEnable}
          formatDate={this.formatDate}
          videoModalOpen={videoModalOpen}
          handleClickVideo={this.handleClickVideo}
          toggleAiVideos={this.toggleAiVideos}
          currentVideo={currentVideo}
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

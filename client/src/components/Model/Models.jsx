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
import Swal from 'sweetalert2/src/sweetalert2';
import { Typography, Button } from '@material-ui/core';

import AIvideos from '../AIVideos/AIvideos';
import GeneralMenu from '../Utilities/GeneralMenu';

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

const styles = theme => ({
  root: {
    margins: 'auto',
    padding: '20px 12%'
  },
  row: {
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.background.default
    }
  }
});

class Models extends Component {
  constructor(props) {
    super(props);
    this.state = {
      models: [],
      videoModalOpen: false
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

    let copyModels = JSON.parse(JSON.stringify(this.state.models));
    let selectedModel = copyModels.find(cmodel => cmodel.name === model.name);
    selectedModel.opened = !selectedModel.opened;
    this.setState(
      {
        models: copyModels
      },
      () => {
        console.log(this.state.models);
      }
    );
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
    const { models, aiVideos, videoModalOpen, currentVideo } = this.state;
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
        )}
      </div>
    );
  }
}

export default withStyles(styles)(Models);

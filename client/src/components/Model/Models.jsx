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
import Swal from 'sweetalert2/src/sweetalert2';
import { Typography } from '@material-ui/core';
import Dialog from '@material-ui/core/Dialog';

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
      infoOpen: false,
      selectedModel: ''
    };
  }

  componentDidMount = () => {
    this.loadExistingModels();
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

  render() {
    const { classes } = this.props;
    const { models, infoOpen, selectedModel } = this.state;
    if (!models) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    return (
      <div className={classes.root}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <CustomTableCell>Name</CustomTableCell>
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
                <CustomTableCell>{model.timestamp}</CustomTableCell>
                <CustomTableCell align="right">
                  <IconButton
                    onClick={() => this.handleOpenInfo(model)}
                    aria-label="Description"
                  >
                    <Description />
                  </IconButton>
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

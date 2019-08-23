import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import axios from 'axios';
import Button from '@material-ui/core/Button';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Table from '@material-ui/core/Table';
import Icon from '@material-ui/core/Icon';
import CircularProgress from '@material-ui/core/CircularProgress';

const styles = () => ({
  root: {
    width: '90%'
  },
  form: {
    width: '10%'
  },
  center: {
    margins: 'auto',
    padding: '20px 3%'
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%'
  },
  running: {
    display: 'flex'
  },
  clear: {
    paddingTop: '3px',
    paddingLeft: '4px',
    fontSize: 28,
    color: '#c70202',
    cursor: 'pointer'
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

class PreviousModels extends Component {
  constructor(props) {
    super(props);

    this.state = {
      runs: [],
      launched: null,
      loadingId: null
    };
  }

  componentDidMount = () => {
    this.loadRunningTensorboard();
    this.loadPreviousRuns();
  };

  loadPreviousRuns = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .get(`/api/models/runs`, config)
      .then(res => {
        this.setState({
          runs: res.data
        });
      })
      .catch(error => {
        console.log('Error in get /api/models/runs');
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  loadRunningTensorboard = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    axios
      .get('/api/models/tensorboard/', config)
      .then(res => {
        this.setState({ launched: parseInt(res.data.id, 10) });
      })
      .catch(error => {
        console.log('Error in get /api/models/tensorboard/');
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  openTensorboard = () => {
    const { launched } = this.state;

    if (launched !== null) {
      if (process.env.NODE_ENV === 'production') {
        console.log(window.location);
        const domain = this.getDomain(window.location.hostname);
        window.open(`https://tensorboard.${domain}`, '_blank');
      } else {
        window.open('http://localhost:6008', '_blank');
      }
    }
  };

  stopTensorboard = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    axios
      .delete(`/api/models/tensorboard/`, config)
      .then(() => {
        this.setState({
          launched: null
        });
      })
      .catch(error => {
        console.log('Error in get /api/models/tensorboard/');
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  launchTensorboard = id => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };

    const body = {
      command: 'launch'
    };

    this.setState({ loadingId: id });

    axios
      .post(`/api/models/tensorboard/${id}`, body, config)
      .then(() => {
        this.setState({ launched: id });
        this.openTensorboard();
      })
      .catch(error => {
        console.log('Error in get /api/models/tensorboard/');
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      })
      .finally(() => this.setState({ loadingId: null }));
  };

  getDomain = url => {
    console.log(url);

    let newUrl = url.replace(/(https?:\/\/)?(www.)?/i, '');
    newUrl = newUrl.split('.');
    newUrl = newUrl.slice(url.length - 2).join('.');

    if (newUrl.indexOf('/') !== -1) {
      return newUrl.split('/')[0];
    }

    return newUrl;
  };

  render() {
    const { classes } = this.props;
    const { runs, launched, loadingId } = this.state;

    return (
      <div className={classes.center}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <CustomTableCell>Run ID</CustomTableCell>
              <CustomTableCell>Name</CustomTableCell>
              <CustomTableCell>Start Train</CustomTableCell>
              <CustomTableCell>End Train</CustomTableCell>
              <CustomTableCell>Min Examples</CustomTableCell>
              <CustomTableCell>Epochs</CustomTableCell>
              <CustomTableCell>Annotation Collections</CustomTableCell>
              <CustomTableCell>Tensorboard</CustomTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map(run => (
              <TableRow key={run.id}>
                <CustomTableCell component="th" scope="row">
                  {run.job_id}
                </CustomTableCell>
                <CustomTableCell align="right">
                  {run.model_name}
                </CustomTableCell>
                <CustomTableCell align="right">
                  {run.start_train}
                </CustomTableCell>
                <CustomTableCell align="right">{run.end_train}</CustomTableCell>
                <CustomTableCell align="right">
                  {run.min_examples}
                </CustomTableCell>
                <CustomTableCell align="right">{run.epochs}</CustomTableCell>
                <CustomTableCell align="right">
                  {run.annotations ? run.annotations.join(', ') : ''}
                </CustomTableCell>
                <CustomTableCell align="right">
                  {launched === run.job_id ? (
                    <div className={classes.running}>
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={this.openTensorboard}
                        style={{ width: 80 }}
                      >
                        Running
                      </Button>
                      <Icon
                        className={classes.clear}
                        onClick={this.stopTensorboard}
                      >
                        clear
                      </Icon>
                    </div>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      color="default"
                      onClick={() => this.launchTensorboard(run.job_id)}
                      style={{ width: 80 }}
                    >
                      {loadingId === run.job_id ? (
                        <CircularProgress size={20} />
                      ) : (
                        'Launch'
                      )}
                    </Button>
                  )}
                </CustomTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}

export default withStyles(styles)(PreviousModels);

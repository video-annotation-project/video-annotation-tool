import React, { Component } from 'react';
import Dialog from '@material-ui/core/Dialog';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableBody from '@material-ui/core/TableBody';
import { Typography } from '@material-ui/core';

const styles = theme => ({
  header: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  users1: {
    marginTop: theme.spacing(3),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(4)
  },
  users2: {
    marginTop: theme.spacing(0.5),
    marginLeft: theme.spacing(6),
    marginRight: theme.spacing(4),
    marginBottom: theme.spacing()
  },
  videos1: {
    marginTop: theme.spacing(),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(4)
  },
  videos2: {
    marginTop: theme.spacing(0.5),
    marginLeft: theme.spacing(6),
    marginRight: theme.spacing(4),
    marginBottom: theme.spacing(3)
  },
  root: {
    margin: theme.spacing()
  }
});

class CollectionInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      table: {}
    };
  }

  componentDidMount = () => {
    this.reformat();
  };

  componentDidUpdate(prevProps) {
    const { counts } = this.props;
    if (counts !== prevProps.counts) {
      this.reformat();
    }
  }

  reformat = () => {
    const { counts } = this.props;
    const table = {};
    counts[0].forEach(concept => {
      table[concept.name] = [concept.count, '0', '0', '0'];
    });
    for (let i = 1; i < 4; i += 1) {
      counts[i].forEach(concept => {
        table[concept.name][i] = concept.count;
      });
    }
    this.setState({
      table
    });
  };

  render() {
    const { open, onClose, data, classes } = this.props;
    const { table } = this.state;

    return (
      <Dialog onClose={onClose} open={open} fullWidth maxWidth="md">
        <div className={classes.root}>
          <Typography className={classes.header} variant="h6">
            {data ? data.name : 'Collection Info'}
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Concept</TableCell>
                <TableCell align="right">User Annotations</TableCell>
                <TableCell align="right">Tracking Annotations</TableCell>
                <TableCell align="right">Verified User Annotations</TableCell>
                <TableCell align="right">
                  Verified Tracking Annotations
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(table).map(concept => {
                return (
                  <TableRow key={concept}>
                    <TableCell component="th" scope="row">
                      {concept}
                    </TableCell>
                    <TableCell component="th" scope="row" align="right">
                      {table[concept][0]}
                    </TableCell>
                    <TableCell component="th" scope="row" align="right">
                      {table[concept][1]}
                    </TableCell>
                    <TableCell component="th" scope="row" align="right">
                      {table[concept][2]}
                    </TableCell>
                    <TableCell component="th" scope="row" align="right">
                      {table[concept][3]}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {data ? (
            <React.Fragment>
              <Typography variant="body2" className={classes.users1}>
                Users ({data.users.length}):
              </Typography>
              <Typography variant="body2" className={classes.users2}>
                {data.users.join(', ')}
              </Typography>
              <Typography variant="body2" className={classes.videos1}>
                Videos ({data.videos.length}):
              </Typography>
              <Typography variant="body2" className={classes.videos2}>
                {data.videos.join(', ')}
              </Typography>
            </React.Fragment>
          ) : (
            ''
          )}
        </div>
      </Dialog>
    );
  }
}

export default withStyles(styles)(CollectionInfo);

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
  },
  tableCell: {
    fontSize: '11pt'
  }
});

class CollectionInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  // reformat = () => {
  //   const { counts } = this.props;
  //   console.log(counts);
  //   const table = {};
  //   counts[0].forEach(concept => {
  //     table[concept.name] = [concept.count, '0', '0', '0'];
  //   });
  //   for (let i = 1; i < 4; i += 1) {
  //     counts[i].forEach(concept => {
  //       table[concept.name][i] = concept.count;
  //     });
  //   }
  //   this.setState({
  //     table
  //   });
  // };

  render() {
    const { open, onClose, data, counts, classes } = this.props;

    return (
      <Dialog onClose={onClose} open={open} fullWidth maxWidth="md">
        <div className={classes.root}>
          <Typography className={classes.header} variant="h6">
            {data ? data.name : 'Training Info'}
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.tableCell}>Concept</TableCell>
                <TableCell className={classes.tableCell} align="right">
                  User Annotations
                </TableCell>
                <TableCell className={classes.tableCell} align="right">
                  Tracking Annotations
                </TableCell>
                <TableCell className={classes.tableCell} align="right">
                  Verified User Annotations
                </TableCell>
                <TableCell className={classes.tableCell} align="right">
                  Verified Tracking Annotations
                </TableCell>
                <TableCell className={classes.tableCell} align="right">
                  All Annotations
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {counts.map(count => {
                return (
                  <TableRow key={count.name}>
                    <TableCell component="th" scope="row">
                      {count.name}
                    </TableCell>
                    <TableCell component="th" scope="row" align="right">
                      {count.user}
                    </TableCell>
                    <TableCell component="th" scope="row" align="right">
                      {count.tracking}
                    </TableCell>
                    <TableCell component="th" scope="row" align="right">
                      {count.verified_user}
                    </TableCell>
                    <TableCell component="th" scope="row" align="right">
                      {count.verified_tracking}
                    </TableCell>
                    <TableCell component="th" scope="row" align="right">
                      {count.total}
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

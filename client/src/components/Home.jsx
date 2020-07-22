import React, { Component } from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import { Grid, Typography } from '@material-ui/core';

import WebsiteDescription from './WebsiteDescription';

const STATUS_SUCESS_CODE = 200;
const YEAR = new Date().getFullYear();

const styles = theme => ({
  welcome: {
    height: '70vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 32
  },
  welcomeUser: {
    marginTop: theme.spacing(8),
    marginBottom: theme.spacing(4),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 32
  },
  root: {
    display: 'flex',
    flexWrap: 'wrap'
  },
  formControl: {
    marginLeft: theme.spacing(2),
    marginBottom: theme.spacing(2),
    minWidth: 120
  },
  info: {
    margin: theme.spacing(2)
  }
});

class Home extends Component {
  constructor(props) {
    super(props);
    const fromDate = this.formatDate(new Date(`${YEAR}-01-01T00:00:00`));
    const toDate = this.formatDate(new Date());
    this.state = {
      counts: [],
      fromDate,
      toDate
    };
  }

  async componentDidMount() {
    const { fromDate, toDate } = this.state;
    this.setState({ fromDate, toDate });
    await this.getCounts(fromDate.ISOString, toDate.ISOString);
    // These variables are for the verify tab checkpoint
    localStorage.setItem('ignoredAnnotations', JSON.stringify([]));
    localStorage.setItem('selectedAnnotationCollections', JSON.stringify([]));
    localStorage.setItem('selectionMounted', true);
    localStorage.setItem('selectedTrackingFirst', false);
    localStorage.setItem('videoDialogOpen', false);
    localStorage.setItem('curIndex', 0);
    localStorage.setItem('totalAnnotations', 0);
    localStorage.removeItem('noAnnotations');
    localStorage.setItem('excludeTracking', false);
  }

  /*
   * Converts a date object into the locale ISO string format.
   * Format output: YYYY-MM-DDTHH:MM:SS
   */
  convertToLocaleISOString = dateObject => {
    let result = '';
    if (dateObject) {
      const year = dateObject.getFullYear();
      let month = dateObject.getMonth();
      let date = dateObject.getDate();
      let hours = dateObject.getHours();
      let minutes = dateObject.getMinutes();
      let seconds = dateObject.getSeconds();
      month = this.formatDateDigits(month + 1); // Pads 0 as the left digit if month is a single digit
      date = this.formatDateDigits(date); // Pads 0 as the left digit if date is a single digit
      hours = this.formatDateDigits(hours);
      minutes = this.formatDateDigits(minutes);
      seconds = '00';

      result = `${year}-${month}-${date}T${hours}:${minutes}:${seconds}`;
    }
    return result;
  };

  /**
   * Formats the digits that are used for a javascript Date object
   * Example: 1 becomes 01
   */
  formatDateDigits = digit => {
    const LAST_TWO_DIGITS = -2;
    return `0${digit}`.slice(LAST_TWO_DIGITS);
  };

  /*
   * Encapsulates a Date object with other custom date properties
   * @param date javascript Date object
   */
  formatDate = date => {
    const DATE_TIME_INDEX = 0;
    const newDate = {
      date,
      localeISOString: this.convertToLocaleISOString(date),
      ISOString: date.toISOString().split('.')[DATE_TIME_INDEX]
    };
    return newDate;
  };

  getCounts = async (fromDate, toDate) => {
    const SPACE_CHAR = ' ';
    const url = '/api/users/annotations';
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      params: {
        userid: localStorage.userid,
        fromdate: fromDate.replace('T', SPACE_CHAR),
        todate: toDate.replace('T', SPACE_CHAR)
      }
    };

    const data = await axios.get(url, config);
    if (data.status === STATUS_SUCESS_CODE) {
      this.setState({ counts: data.data });
    }
  };

  /*
   * Gets the total annotations from all species annotated
   */
  getTotalCount = () => {
    const { counts } = this.state;
    let annotationTotal = 0;
    let verificationTotal = 0;
    counts.forEach(row => {
      annotationTotal += Number(row.annotation_count);
      verificationTotal += Number(row.verification_count);
    });
    return [annotationTotal, verificationTotal];
  };

  renderCounts = () => {
    const { counts } = this.state;
    return counts.map(row => (
      <TableRow key={row.conceptid}>
        <TableCell component="th" scope="row">
          {row.name}
        </TableCell>
        <TableCell align="right">{row.annotation_count}</TableCell>
        <TableCell align="right">{row.verification_count}</TableCell>
      </TableRow>
    ));
  };

  handleDateChange = event => {
    const { fromDate, toDate } = this.state;
    if (event) {
      const { name } = event.target;
      let value = new Date(event.target.value);
      if (name === 'fromDate' && event.target.value === '') {
        value = new Date(`${YEAR}-01-01T00:00:00`);
      } else if (name === 'toDate' && event.target.value === '') {
        value = new Date();
      }

      const newDate = this.formatDate(value);

      this.setState({ [name]: newDate });
      this.getCounts(
        name === 'fromDate' ? newDate.ISOString : fromDate.ISOString,
        name === 'toDate' ? newDate.ISOString : toDate.ISOString
      );
    }
  };

  render() {
    const { fromDate, toDate, counts } = this.state;
    const { classes } = this.props;
    const [annotationTotal, verificationTotal] = this.getTotalCount();
    return (
      <div className="users body-container">
        {localStorage.username ? (
          <>
            <Typography
              className={
                localStorage.username ? classes.welcomeUser : classes.welcome
              }
            >
              Welcome {localStorage.username}
            </Typography>
            <Grid container alignItems="center" wrap="nowrap">
              <Grid item>
                <TextField
                  id="from-date"
                  label="From"
                  type="datetime-local"
                  name="fromDate"
                  className={classes.formControl}
                  defaultValue={fromDate.localeISOString}
                  onChange={this.handleDateChange}
                  InputLabelProps={{
                    shrink: true
                  }}
                />
              </Grid>
              <Grid>
                <TextField
                  id="to-date"
                  label="To"
                  type="datetime-local"
                  name="toDate"
                  className={classes.formControl}
                  defaultValue={toDate.localeISOString}
                  onChange={this.handleDateChange}
                  InputLabelProps={{
                    shrink: true
                  }}
                />
              </Grid>
            </Grid>
            <Paper>
              <Table id="CountsTable">
                <TableHead>
                  <TableRow>
                    <TableCell>Species</TableCell>
                    <TableCell align="right">Total Annotated</TableCell>
                    <TableCell align="right">Total Verified</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{counts ? this.renderCounts() : null}</TableBody>
              </Table>
            </Paper>
            <div style={{ clear: 'both' }}>
              <Typography
                variant="h6"
                className={classes.info}
                style={{ float: 'left' }}
              >
                Total Annotations: {annotationTotal}
              </Typography>
              <Typography
                variant="h6"
                className={classes.info}
                style={{ float: 'right' }}
              >
                Total Verifications: {verificationTotal}
              </Typography>
            </div>
          </>
        ) : (
          <WebsiteDescription />
        )}
      </div>
    );
  }
}

export default withStyles(styles)(Home);

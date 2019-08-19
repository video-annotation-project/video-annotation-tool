import React, { Component } from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import { Grid, Typography } from '@material-ui/core';

const STATUS_SUCESS_CODE = 200;
const YEAR = new Date().getFullYear();

const styles = theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap'
  },
  formControl: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing(2),
    marginBottom: theme.spacing(2),
    minWidth: 120
  },
  info: {
    margin: theme.spacing(2)
  }
});

class Users extends Component {
  state = {
    selectedUser: '',
    users: [],
    counts: [],
    fromDate: {
      date: null,
      localeISOString: '',
      ISOString: ''
    },
    toDate: {
      date: null,
      localeISOString: '',
      ISOString: ''
    }
  };

  componentWillMount() {
    this.getUsers();
    const fromDate = this.formatDate(new Date(`${YEAR}-01-01T00:00:00`));
    const toDate = this.formatDate(new Date());
    this.setState({ fromDate, toDate });
  }

  /**
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

  /**
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

  getUsers = async () => {
    const url = '/api/users';
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const data = await axios.get(url, config);
    if (data.status === STATUS_SUCESS_CODE) {
      this.setState({ users: data.data });
    }
  };

  getCounts = async (userId, fromDate, toDate) => {
    const SPACE_CHAR = ' ';
    const url = '/api/users/annotations';
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      params: {
        userid: userId,
        fromdate: fromDate.replace('T', SPACE_CHAR),
        todate: toDate.replace('T', SPACE_CHAR)
      }
    };

    const data = await axios.get(url, config);
    if (data.status === STATUS_SUCESS_CODE) {
      this.setState({ counts: data.data });
    }
  };

  /**
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

  renderUserSelectOptions = () => {
    const { users } = this.state;
    return users.map(option => (
      <MenuItem key={option.id} value={option.username}>
        {option.username}
      </MenuItem>
    ));
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

  handleUserSelectChange = event => {
    const { users, fromDate, toDate } = this.state;
    if (event) {
      const selectedUser = event.target.value;
      if (selectedUser) {
        this.setState({ selectedUser });
        const userData = users.find(user => {
          return user.username === selectedUser;
        });
        this.getCounts(userData.id, fromDate.ISOString, toDate.ISOString);
      }
    }
  };

  handleDateChange = event => {
    const { users, fromDate, toDate } = this.state;
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
      const { selectedUser } = this.state;
      if (selectedUser) {
        const userData = users.find(user => {
          return user.username === selectedUser;
        });
        this.getCounts(
          userData.id,
          name === 'fromDate' ? newDate.ISOString : fromDate.ISOString,
          name === 'toDate' ? newDate.ISOString : toDate.ISOString
        );
      }
    }
  };

  render() {
    const { selectedUser, fromDate, toDate, counts, users } = this.state;
    const { classes } = this.props;
    const [annotationTotal, verificationTotal] = this.getTotalCount();
    return (
      <div className="users body-container">
        <Grid container alignItems="center" wrap="nowrap">
          <Grid item>
            <FormControl className={classes.formControl}>
              <InputLabel>User</InputLabel>
              <Select
                value={selectedUser}
                onChange={this.handleUserSelectChange}
                inputProps={{
                  name: 'user'
                }}
              >
                {users ? this.renderUserSelectOptions() : null}
              </Select>
            </FormControl>
          </Grid>
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
      </div>
    );
  }
}

export default withStyles(styles)(Users);

import React, { Component } from "react";
import axios from "axios";
import { withStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import { Grid } from "@material-ui/core";

const STATUS_SUCESS_CODE = 200;

const styles = theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap"
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 120
  },
  selectEmpty: {
    marginTop: theme.spacing.unit * 2
  }
});

class Users extends Component {
  state = {
    selectedUser: {
      id: null,
      username: ""
    },
    users: [],
    annotationCount: [],
    fromDate: {
      date: null,
      localeISOString: "",
      ISOString: ""
    },
    toDate: {
      date: null,
      localeISOString: "",
      ISOString: ""
    }
  };

  componentWillMount() {
    this.getUsers();
    this.initDatepickers();
  }

  initDatepickers = () => {
    const to = new Date();
    const firstMonthDigit = "01"; // January
    const firstDateDigit = "01"; // 1st
    const currentFullYear = to.getFullYear();
    const firstHourOfDay = "00:00:00";
    const firstDateOfYear =
      currentFullYear + "-" + firstDateDigit + "-" + firstMonthDigit;
    const from = new Date(firstDateOfYear + "T" + firstHourOfDay);

    const toDate = this.formatDate(to);
    const fromDate = this.formatDate(from);
    this.setState({ fromDate: fromDate, toDate: toDate });
  };

  /**
   * Converts a date object into the locale ISO string format.
   * Format output: YYYY-MM-DDTHH:MM:SS
   */
  convertToLocaleISOString = dateObject => {
    let result = "";
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
      seconds = "00";

      result =
        year +
        "-" +
        month +
        "-" +
        date +
        "T" +
        hours +
        ":" +
        minutes +
        ":" +
        seconds;
    }
    return result;
  };

  /**
   * Formats the digits that are used for a javascript Date object
   * Example: 1 becomes 01
   */
  formatDateDigits = digit => {
    const LAST_TWO_DIGITS = -2;
    return ("0" + digit).slice(LAST_TWO_DIGITS);
  };

  /**
   * Encapsulates a Date object with other custom date properties
   * @param date javascript Date object
   */
  formatDate = date => {
    const DATE_TIME_INDEX = 0;
    const newDate = {
      date: date,
      localeISOString: this.convertToLocaleISOString(date),
      ISOString: date.toISOString().split(".")[DATE_TIME_INDEX]
    };
    return newDate;
  };

  getUsers = async () => {
    const url = "/api/users";
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const data = await axios.get(url, config);
    if (data.status === STATUS_SUCESS_CODE) {
      this.setState({ users: data.data });
    }
  };

  getAnnotationCount = async (userId, fromDate, toDate) => {
    const SPACE_CHAR = " ";
    const url = "/api/users/annotationCount";
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      params: {
        userid: userId,
        fromdate: fromDate.replace("T", SPACE_CHAR),
        todate: toDate.replace("T", SPACE_CHAR)
      }
    };

    const data = await axios.get(url, config);
    if (data.status === STATUS_SUCESS_CODE) {
      this.setState({ annotationCount: data.data });
    }
  };

  /**
   * Gets the total annotations from all species annotated
   */
  getTotalAnnotations = () => {
    let total = 0;
    this.state.annotationCount.forEach(annotation => {
      total += parseInt(annotation.total_count);
    });
    return total;
  };

  renderUserSelectOptions = () => {
    return this.state.users.map(option => (
      <MenuItem key={option.id} value={option}>
        {option.username}
      </MenuItem>
    ));
  };

  renderAnnotationCount = () => {
    return this.state.annotationCount.map(row => (
      <TableRow key={row.conceptid}>
        <TableCell component="th" scope="row">
          {row.name}
        </TableCell>
        <TableCell align="right">{row.total_count}</TableCell>
      </TableRow>
    ));
  };

  handleUserSelectChange = event => {
    if (event) {
      const selectedUser = event.target.value;
      if (selectedUser.id) {
        this.setState({ selectedUser: selectedUser });
        this.getAnnotationCount(
          selectedUser.id,
          this.state.fromDate.ISOString,
          this.state.toDate.ISOString
        );
      }
    }
  };

  handleDateChange = event => {
    if (event) {
      const value = new Date(event.target.value);
      const name = event.target.name;
      const newDate = this.formatDate(value);

      this.setState({ [name]: newDate });
      if (this.state.selectedUser.id) {
        this.getAnnotationCount(
          this.state.selectedUser.id,
          name === "fromDate"
            ? newDate.ISOString
            : this.state.fromDate.ISOString,
          name === "toDate" ? newDate.ISOString : this.state.toDate.ISOString
        );
      }
    }
  };

  render() {
    const { classes } = this.props;
    return (
      <div className="users body-container">
        <h2>Users</h2>
        <Grid container alignItems="baseline" wrap="nowrap" spacing={32}>
          <Grid item>
            <FormControl className={classes.formControl}>
              <InputLabel>User</InputLabel>
              <Select
                value={this.state.selectedUser}
                onChange={this.handleUserSelectChange}
                inputProps={{
                  name: "user"
                }}
              >
                {this.state.users ? this.renderUserSelectOptions() : null}
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <TextField
              id="from-date"
              label="From"
              type="datetime-local"
              name="fromDate"
              defaultValue={this.state.fromDate.localeISOString}
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
              defaultValue={this.state.toDate.localeISOString}
              onChange={this.handleDateChange}
              InputLabelProps={{
                shrink: true
              }}
            />
          </Grid>
        </Grid>
        <Paper>
          <Table id="annotationCountTable">
            <TableHead>
              <TableRow>
                <TableCell>Species</TableCell>
                <TableCell align="right">Total Anootated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {this.state.annotationCount ? this.renderAnnotationCount() : null}
            </TableBody>
          </Table>
        </Paper>
        <h3>Total Annotations: {this.getTotalAnnotations()}</h3>
      </div>
    );
  }
}

export default withStyles(styles)(Users);

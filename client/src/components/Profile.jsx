import React, { Component } from 'react';
import axios from 'axios';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Swal from 'sweetalert2';

const styles = {
  root: {
    height: '70vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }
};

class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      password: '',
      newPassword1: '',
      newPassword2: ''
    };
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  handleSubmit = event => {
    const { history } = this.props;
    event.preventDefault();
    const { password, newPassword1, newPassword2 } = this.state;
    if (newPassword1 !== newPassword2) {
      Swal.fire('New passwords do not match!', '', 'error');
      return;
    }
    if (newPassword1 === '') {
      Swal.fire('Please enter a new password', '', 'error');
      return;
    }
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      password,
      newPassword1,
      newPassword2
    };
    axios
      .patch('/api/users', body, config)
      .then(() => {
        Swal.fire('Password Changed!', '', 'success');
        history.push('/');
      })
      .catch(error => {
        console.log(error.response);
        Swal.fire(error.response.data.detail, '', 'error');
      });
  };

  render() {
    const { classes } = this.props;
    const { password, newPassword1, newPassword2 } = this.state;
    return (
      <div className={classes.root}>
        <Typography variant="h4">Change Password</Typography>
        <br />
        <form onSubmit={this.handleSubmit}>
          <TextField
            id="current-pw"
            label="Current Password"
            type="password"
            name="password"
            value={password}
            onChange={this.handleChange}
          />
          <br />
          <TextField
            id="new-pw1"
            label="New Password"
            type="password"
            name="newPassword1"
            value={newPassword1}
            onChange={this.handleChange}
          />
          <br />
          <TextField
            id="new-pw2"
            label="Confirm New Password"
            type="password"
            name="newPassword2"
            value={newPassword2}
            onChange={this.handleChange}
          />
          <br />
          <br />
          <Button
            id="form-submit"
            type="submit"
            variant="contained"
            color="primary"
          >
            Submit
          </Button>
        </form>
      </div>
    );
  }
}

export default withStyles(styles)(Profile);

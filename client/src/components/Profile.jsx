import React, { Component } from 'react';
import axios from 'axios';

import ErrorModal from './ErrorModal.jsx';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

const styles= {
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
      newPassword2: '',
      errorMsg: null,
      open: false,
    };
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  handleSubmit = event => {
    event.preventDefault();
    const {password, newPassword1, newPassword2} = this.state;
    if (newPassword1 !== newPassword2) {
      this.setState({
        errorMsg: "New passwords do not match!",
        open: true
      });
      return;
    }
    if (newPassword1 === "") {
      this.setState({
        errorMsg: "Please enter a new password",
        open: true
      })
      return;
    }
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    const body = {
      'password': password,
      'newPassword1': newPassword1,
      'newPassword2': newPassword2,
    }
    axios.post('/api/changePassword', body, config).then(res => {
      alert(res.data.message)
      this.props.history.push('/')
    }).catch(error => {
      console.log(error);
      if (error.response) {
        this.setState({
          errorMsg: error.response.data.detail,
          open: true
        });
      }
    })
  };

  handleClose = () => {
    this.setState({ open: false });
  };

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Typography variant="display1">Change Password</Typography><br />
        <ErrorModal errorMsg={this.state.errorMsg} open={this.state.open} handleClose={this.handleClose}/>
        <form onSubmit={this.handleSubmit}>
          <div>Current Password: </div>
          <input type='password' name='password' value={this.state.password} onChange= {this.handleChange}/>
          <br /><br />
          <div>New Password: </div>
          <input type='password' name='newPassword1' value={this.state.newPassword1} onChange= {this.handleChange}/>
          <br /><br />
          <div>Confirm Password: </div>
          <input type="password" name="newPassword2" value={this.state.newPassword2} onChange= {this.handleChange} />
          <br /><br /><br />
          <input type='submit' value='Submit'/>
        </form>
      </div>
    );
  }
}

export default withStyles(styles)(Profile);

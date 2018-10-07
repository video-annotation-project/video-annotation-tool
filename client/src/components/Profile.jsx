import React, { Component } from 'react';
import ErrorModal from './ErrorModal.jsx';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import { Link } from 'react-router-dom';

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
      password1: '',
      password2: '',
      aws_secret_access_key: '',
      aws_access_key_id: '',
      dbname: '',
      dbhost: '',
      dbpassword: '',
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
    fetch('/changePassword', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
      body: JSON.stringify({
        'password': this.state.password,
        'password1': this.state.password1,
        'password2': this.state.password2,
      })
    }).then(res => res.json()).then(res => {
      if (res.message === "Changed") {
        alert(res.message)
        this.props.history.push('/')
      } else {
        this.setState({
          errorMsg: res.message,
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
          <input type='password' name='password1' value={this.state.password1} onChange= {this.handleChange}/>
          <br /><br />
          <div>Confirm Password: </div>
          <input type="password" name="password2" value={this.state.password2} onChange= {this.handleChange} />
          <br /><br /><br />
          <input type='submit' value='Submit'/>
        </form>
        <React.Fragment>
          {localStorage.getItem('admin') ? (
            <div>
              <br /><br /><br />
              <Typography variant="display1">Settings</Typography><br />
              <ErrorModal errorMsg={this.state.errorMsg} open={this.state.open} handleClose={this.handleClose}/>
              <form onSubmit={this.handleSubmit}>
                <div>AWS Secret Access Key: </div>
                <br />
                <div>AWS Access Key ID: </div>
                <br />
                <div>DB Name: </div>
                <br />
                <div>DB Host: </div>
                <br />
                <div>DB Password: </div>
                <br />
                <br /><br />
              </form>
            </div>
          ):(
            <React.Fragment>
            </React.Fragment>
          )}

        </React.Fragment>
      </div>
    );
  }
}

export default withStyles(styles)(Profile);

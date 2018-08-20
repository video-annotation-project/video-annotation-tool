import React, { Component } from 'react';
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
      password1: '',
      password2: '',
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
    fetch('/changePass', {
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
      </div>
    );
  }
}

export default withStyles(styles)(Profile);

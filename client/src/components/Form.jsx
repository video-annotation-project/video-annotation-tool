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

class Form extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      errorMsg: null,
      open: false //For error modal box
    };
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  handleSubmit = event => {
    event.preventDefault();
    fetch('/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        'username': this.state.username,
        'password': this.state.password
      })
    }).then(res => res.json()).then(res => {
      if (res.message === 'welcome') {
        localStorage.setItem('isAuthed', 'true');
        localStorage.setItem('token', res.token);
        //Add code for admin
        if (res.admin) {
          localStorage.setItem('admin', res.admin);
        }
        this.props.history.push('/');
      } else {
        localStorage.clear();
        this.setState({
          errorMsg: res.message,
          open: true
        });
      }
    });
  };

  //Code for closing modal
  handleClose = () => {
    this.setState({ open: false });
  };

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Typography variant="display1">Login</Typography><br />
        <ErrorModal errorMsg={this.state.errorMsg} open={this.state.open} handleClose={this.handleClose}/>
        <form onSubmit={this.handleSubmit}>
          <div>username</div>
          <input type='text' name='username' value={this.state.username} onChange= {this.handleChange}/>
          <br /><br />
          <div>password</div>
          <input type='password' name='password' value={this.state.password} onChange= {this.handleChange}/>
          <br /><br />
          <input type='submit' value='Login'/>
        </form>
      </div>
    );
  }
}

export default withStyles(styles)(Form);

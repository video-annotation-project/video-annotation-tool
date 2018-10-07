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

  componentDidMount = async () => {
    fetch('/api/userInfo', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    }).then(res => res.json())
    .then(res => {
      this.setState({
        aws_secret_access_key: res.rows[0].aws_secret_access_key,
        aws_access_key_id: res.rows[0].aws_access_key_id,
        dbname: res.rows[0].dbname,
        dbhost: res.rows[0].dbhost,
        dbpassword: res.rows[0].dbpassword
      });
    })
  }

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
                <div>AWS Secret Access Key: {this.state.aws_secret_access_key}</div>
                <br />
                <div>AWS Access Key ID: {this.state.aws_access_key_id}</div>
                <br />
                <div>DB Name: {this.state.dbname}</div>
                <br />
                <div>DB Host: {this.state.dbhost}</div>
                <br />
                <div>DB Password: {this.state.dbpassword}</div>
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

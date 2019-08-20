import React, { Component } from 'react';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import axios from 'axios';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Swal from 'sweetalert2/src/sweetalert2';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';

const styles = {
  root: {
    height: '70vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  input: {
    width: '269px'
  }
};

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      showPassword: false
    };
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  toggleShowPassword = () => {
    const { showPassword } = this.state;
    this.setState({
      showPassword: !showPassword
    });
  };

  handleSubmit = event => {
    event.preventDefault();
    const { username, password } = this.state;
    if (!username || !password) {
      return;
    }
    const body = {
      username,
      password
    };
    axios
      .post('/api/users/login', body, {
        headers: { 'Content-Type': 'application/json' }
      })
      .then(res => {
        localStorage.setItem('isAuthed', 'true');
        localStorage.setItem('userid', res.data.userid);
        localStorage.setItem('username', username);
        localStorage.setItem('token', res.data.token);
        // Add code for isAdmin
        if (res.data.isAdmin) {
          localStorage.setItem('admin', res.data.isAdmin);
        }
        window.location.replace('/');
      })
      .catch(error => {
        console.log(error);
        if (error.response) {
          console.log(error.response);
          Swal.fire(error.response.data.detail, '', 'error');
        }
      });
  };

  render() {
    const { classes } = this.props;
    const { username, password, showPassword } = this.state;
    return (
      <div className={classes.root}>
        <Typography variant="h4">Login</Typography>
        <br />
        <form onSubmit={this.handleSubmit}>
          <TextField
            id="username"
            className={classes.input}
            name="username"
            label="Username"
            type="text"
            value={username}
            onChange={this.handleChange}
            margin="normal"
            variant="filled"
            required
          />
          <br />
          <TextField
            id="password"
            className={classes.input}
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={this.handleChange}
            margin="normal"
            variant="filled"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-label="toggle password visibility"
                    onClick={this.toggleShowPassword}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <br />
          <br />
          <Button id="login" type="submit" variant="contained" color="primary">
            Login
          </Button>
        </form>
      </div>
    );
  }
}

export default withStyles(styles)(Login);

import React, { Component } from "react";
import ErrorModal from "./ErrorModal.jsx";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import axios from "axios";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import swal from '@sweetalert/with-react'

const styles = {
  root: {
    height: "70vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  }
};

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: "",
      password: "",
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
    const { username, password } = this.state;
    if (!username || !password) {
      return;
    }
    const body = {
      username: username,
      password: password
    };
    axios
      .post("/api/login", body, {
        headers: { "Content-Type": "application/json" }
      })
      .then(res => {
        localStorage.setItem("isAuthed", "true");
        localStorage.setItem("username", username);
        localStorage.setItem("token", res.data.token);
        //Add code for isAdmin
        if (res.data.isAdmin) {
          localStorage.setItem("admin", res.data.isAdmin);
        }
        this.props.history.push("/");
      })
      .catch(error => {
        console.log(error);
        if (error.response) {
          console.log(error.response);
          swal(
            error.response.data.detail, '',
            "error"
          );
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
        <Typography variant="display1">Login</Typography>
        <br />
        <ErrorModal
          errorMsg={this.state.errorMsg}
          open={this.state.open}
          handleClose={this.handleClose}
        />
        <form onSubmit={this.handleSubmit}>
          <TextField
            name="username"
            label="User Name"
            type="text"
            value={this.state.username}
            onChange={this.handleChange}
            margin="normal"
          />
          <br />
          <TextField
            name="password"
            label="Password"
            type="password"
            value={this.state.password}
            onChange={this.handleChange}
            margin="normal"
          />
          <br />
          <Button type="submit" variant="contained" color="primary">
            Login
          </Button>
        </form>
      </div>
    );
  }
}

export default withStyles(styles)(Login);

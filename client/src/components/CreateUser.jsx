import React, { Component } from "react";
import axios from "axios";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import Swal from "sweetalert2";
import { TextField } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';

const styles = {
  root: {
    height: "70vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  }
};

class CreateUser extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: "",
      password: "",
      admin: false
    };
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  handleBoxChange = event => {
    this.setState({
      [event.target.name]: event.target.checked
    });
  };

  handleSubmit = async event => {
    event.preventDefault();
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      username: this.state.username,
      password: this.state.password,
      admin: this.state.admin
    };
    try {
      let newUserInfo = await axios.post("/api/users", body, config);
      console.log(newUserInfo);
      Swal.fire("Created a new user: " + newUserInfo.data.user.username, 
      "", "success");
      this.props.history.push("/");
    } catch (error) {
      console.log(error);
      if (error.response) {
        Swal.fire(error.response.data.detail, "", "error");
      }
    }
  };

  //Code for closing modal
  handleClose = () => {
    this.setState({ open: false });
  };

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Typography variant="h4">Create New User</Typography>
        <br />
        <form onSubmit={this.handleSubmit}>
          {/* <div>username</div> */}
          <TextField
            label="User Name"
            type="text"
            name="username"
            value={this.state.username}
            onChange={this.handleChange}
            margin="normal"
            required
          />
          <br />
          {/* <br />
          <div>password</div> */}
          <TextField
            label="Password"
            type="password"
            name="password"
            value={this.state.password}
            onChange={this.handleChange}
            margin="normal"
            required
          />
          <br />
          <FormControlLabel
            control={
              <Checkbox
                // type="checkbox"
                name="admin"
                checked={this.state.admin}
                onChange={this.handleBoxChange}
              />
            }
            label = "admin"
          />
          <br />
          <Button type="submit" variant="contained" color="primary">
            Create
          </Button>
        </form>
      </div>
    );
  }
}

export default withStyles(styles)(CreateUser);

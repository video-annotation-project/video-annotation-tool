import React, { Component } from "react";
import axios from "axios";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import swal from "@sweetalert/with-react";

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
      let newUserInfo = await axios.post("/api/createUser", body, config);
      console.log(newUserInfo);
      alert("Created a new user: " + JSON.stringify(newUserInfo.data.user));
      this.props.history.push("/");
    } catch (error) {
      console.log(error);
      if (error.response) {
        swal(error.response.data.detail, "", "error");
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
        <Typography variant="display1">Create New User</Typography>
        <br />
        <form onSubmit={this.handleSubmit}>
          <div>username</div>
          <input
            type="text"
            name="username"
            value={this.state.username}
            onChange={this.handleChange}
            required
          />
          <br />
          <br />
          <div>password</div>
          <input
            type="password"
            name="password"
            value={this.state.password}
            onChange={this.handleChange}
            required
          />
          <br />
          <br />
          <input
            type="checkbox"
            name="admin"
            checked={this.state.admin}
            onChange={this.handleBoxChange}
          />
          admin
          <br />
          <input type="submit" value="Create" />
        </form>
      </div>
    );
  }
}

export default withStyles(styles)(CreateUser);

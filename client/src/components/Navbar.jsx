import React from "react";
import { Link } from "react-router-dom";
import { withStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Button from "@material-ui/core/Button";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";

const styles = {
  flex: {
    flexGrow: 1
  }
};

class Navbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  handleLogout = () => {
    /* Annotate.jsx tries to PUT to /api/checkpoints when unmounted, so we redirect 
    the web page before clearing authentication */
    /* In theory, nothing after the redirect statement should execute, which is a 
    problem. Luckily, it actually does execute via race condition. */
    window.location.replace("/");
    localStorage.clear();
  };

  render() {
    const { classes } = this.props;
    return (
      <AppBar position="static">
        <Toolbar>
          <Typography variant="title" color="inherit" className={classes.flex}>
            Video Annotation Tool
          </Typography>
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>
          {localStorage.getItem("isAuthed") ? (
            <React.Fragment>
              {localStorage.getItem("admin") ? (
                <React.Fragment>
                  <Button color="inherit" component={Link} to="/concepts">
                    Select Concepts
                  </Button>
                  <Button color="inherit" component={Link} to="/annotate">
                    Annotate Videos
                  </Button>
                  <Button color="inherit" component={Link} to="/report">
                    Report
                  </Button>
                  <Button color="inherit" component={Link} to="/createUser">
                    Create User
                  </Button>
                  <Button color="inherit" component={Link} to="/models">
                    Models
                  </Button>
                  <Button color="inherit" component={Link} to="/users">
                    Users
                  </Button>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Button color="inherit" component={Link} to="/concepts">
                    Select Concepts
                  </Button>
                  <Button color="inherit" component={Link} to="/annotate">
                    Annotate Videos
                  </Button>
                  <Button color="inherit" component={Link} to="/report">
                    {" "}
                    Report{" "}
                  </Button>
                </React.Fragment>
              )}
              <Button color="inherit" component={Link} to="/verify">
                Verify
              </Button>
              <Button color="inherit" component={Link} to="/profile">
                Account
              </Button>
              <Button
                color="inherit"
                // component={Link}
                // to="/"
                onClick={this.handleLogout}
              >
                Logout
              </Button>
            </React.Fragment>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
    );
  }
}

export default withStyles(styles)(Navbar);

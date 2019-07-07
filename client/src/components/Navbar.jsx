import React from "react";
import { Link } from "react-router-dom";
import { withStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Button from "@material-ui/core/Button";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Popper from '@material-ui/core/Popper';
import Paper from '@material-ui/core/Paper';
import MenuList from '@material-ui/core/MenuList';
import MenuItem from '@material-ui/core/MenuItem';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';

const styles = {
  flex: {
    flexGrow: 1
  },
};



class Navbar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modelTabOpen: false,
    };
  }

  handleLogout = () => {
    /* Annotate.jsx tries to PUT to /api/checkpoints when unmounted, so we redirect 
    the web page before clearing authentication */
    /* In theory, nothing after the redirect statement should execute, which is a 
    problem. Luckily, it actually does execute via race condition. */
    window.location.replace("/");
    localStorage.clear();
  };

  handleModelTab = () => {
    this.setState({ modelTabOpen: !this.state.modelTabOpen });
  }

  closeModelTab = () => {
    this.setState({ modelTabOpen: false });
  }


  render() {
    const { classes } = this.props;
    return (
      <AppBar position="static">
        <Toolbar>
          <Typography color="inherit" className={classes.flex}>
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
                  <Button color="inherit" component={Link} to="/aivideos">
                    AI Videos
                  </Button>
                  <Button color="inherit" component={Link} to="/report">
                    Report
                  </Button>
                  <Button color="inherit" component={Link} to="/createUser">
                    Create User
                  </Button>
                  <Button 
                    color="inherit" 
                    id="modelButton"
                    onClick={this.handleModelTab}
                  >
                    Models
                  </Button>
                  <Popper 
                    open={ this.state.modelTabOpen }
                    anchorEl={document.getElementById("modelButton")}
                  >
                    <ClickAwayListener onClickAway={this.closeModelTab}>
                      <Paper square>
                        <MenuList onClick={ this.closeModelTab }>
                          <MenuItem component={Link} to="/models/create">
                            Create New Model
                          </MenuItem>
                          <MenuItem component={Link} to="/models/view">
                            View Models
                          </MenuItem>
                          <MenuItem component={Link} to="/models/train">
                            Train Model
                          </MenuItem>
                          <MenuItem component={Link} to="/models/predict">
                            Predict Model
                          </MenuItem>
                          <MenuItem component={Link} to="/models/runs">
                            Previous Models
                          </MenuItem>
                        </MenuList>
                      </Paper>
                    </ClickAwayListener>
                    </Popper>
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

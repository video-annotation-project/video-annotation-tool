import React from "react";
import { Link } from "react-router-dom";
import { withStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Button from "@material-ui/core/Button";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import GeneralMenu from "./Utilities/GeneralMenu";

const styles = {
  flex: {
    flexGrow: 1
  }
};

class Navbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modelTabOpen: false
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
  };

  closeModelTab = () => {
    this.setState({ modelTabOpen: false });
  };

  render() {
    const { classes } = this.props;
    let accountItems = [{ name: "Profile", link: "/account/profile" }];
    if (localStorage.getItem("admin")) {
      accountItems.push({ name: "Create User", link: "/account/createUser" });
    }

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
              <Button color="inherit" component={Link} to="/concepts">
                Select Concepts
              </Button>
              <GeneralMenu
                name={"Collections"}
                Link={Link}
                items={[
                  { name: "Concepts", link: "/conceptCollection" },
                  { name: "Videos", link: "/videoCollection" }
                ]}
              />
              <GeneralMenu
                name={"Annotate"}
                Link={Link}
                items={[
                  { name: "Videos", link: "/annotate/videos" },
                  { name: "Verify", link: "/annotate/verify" }
                ]}
              />
              <Button color="inherit" component={Link} to="/report">
                Report
              </Button>
              {localStorage.getItem("admin") ? (
                <React.Fragment>
                  <GeneralMenu
                  name={"Models"}
                  Link={Link}
                  items={[
                    { name: "Create Model", link: "/models/create" },
                    { name: "View Models", link: "/models/view" },
                    { name: "Train Models", link: "/models/train" },
                    { name: "Predict Models", link: "/models/predict" },
                    { name: "Previous Models", link: "/models/runs" }
                  ]}
                />
                <Button color="inherit" component={Link} to="/aivideos">
                  AI Videos
                  </Button>
                <Button color="inherit" component={Link} to="/users">
                  Users
                  </Button>
              </React.Fragment>
              ) : ("")}
              <GeneralMenu name={"Account"} Link={Link} items={accountItems} />
              <Button
                color="inherit"
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

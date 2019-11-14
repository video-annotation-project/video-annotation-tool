import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { Divider } from '@material-ui/core';
import GeneralMenu from './Utilities/GeneralMenu';

const styles = theme => ({
  flex: {
    flexGrow: 1
  },
  pathname: {
    margin: theme.spacing(1.5),
    marginLeft: theme.spacing(3)
  },
  divider: {
    marginBottom: theme.spacing(0)
  }
});

class Navbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modelTabOpen: false
    };
  }

  handleLogout = () => {
    /* Annotate.jsx tries to PUT to /api/videos/checkpoints when unmounted, so we redirect 
    the web page before clearing authentication */
    /* In theory, nothing after the redirect statement should execute, which is a 
    problem. Luckily, it actually does execute via race condition. */
    window.location.replace('/');
    localStorage.clear();
  };

  handleModelTab = () => {
    this.setState(prevState => ({
      modelTabOpen: !prevState.modelTabOpen
    }));
  };

  closeModelTab = () => {
    this.setState({ modelTabOpen: false });
  };

  titleCase = str => {
    const splitStr = str.split('/');
    for (let i = 0; i < splitStr.length; i += 1) {
      // You do not need to check if i is larger than splitStr length, as your for does that for you
      // Assign it back to the array
      splitStr[i] =
        splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }
    if (splitStr.includes('Collection')) {
      return splitStr.reverse().join(' ');
    }
    // Directly return the joined string
    return splitStr.join(' ');
  };

  render() {
    const { classes, location } = this.props;
    const accountItems = [
      { id: 'navbar-profile', name: 'Profile', link: '/account/profile' }
    ];
    if (localStorage.getItem('admin')) {
      accountItems.push({ name: 'Create User', link: '/account/create' });
      accountItems.push({ name: 'Users', link: '/users' });
    }

    return (
      <>
        <AppBar position="static">
          <Toolbar>
            <Typography
              variant="button"
              color="inherit"
              className={classes.flex}
            >
              Video Annotation Tool
            </Typography>
            {/* <Button color="inherit" component={Link} to="/">
              Home
            </Button> */}
            {localStorage.getItem('isAuthed') ? (
              <>
                <Button
                  id="navbar-concepts"
                  color="inherit"
                  component={Link}
                  to="/concepts"
                >
                  Concepts
                </Button>
                <GeneralMenu
                  id="navbar-collections"
                  name="Collections"
                  Link={Link}
                  items={[
                    { name: 'Annotations', link: '/collection/annotation' },
                    { name: 'Concepts', link: '/collection/concept' },
                    { name: 'Videos', link: '/collection/video' }
                  ]}
                />
                <GeneralMenu
                  buttonid="navbar-annotate"
                  name="Annotate"
                  Link={Link}
                  items={[
                    {
                      id: 'navbar-annotate-videos',
                      name: 'Videos',
                      link: '/annotate/videos'
                    },
                    {
                      id: 'navbar-annotate-verify',
                      name: 'Verify',
                      link: '/annotate/verify'
                    }
                  ]}
                />
                <Button
                  id="navbar-report"
                  color="inherit"
                  component={Link}
                  to="/report"
                >
                  Report
                </Button>
                <Button
                  id="navbar-models"
                  name="Models"
                  component={Link}
                  to="/models"
                >
                  Models
                </Button>
                <GeneralMenu
                  buttonid="navbar-account"
                  name="Account"
                  Link={Link}
                  items={accountItems}
                />
                <Button
                  id="navbar-logout"
                  color="inherit"
                  onClick={this.handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <div>
                <Button color="inherit" href="#team">
                  Our Team
                </Button>
                <Button color="inherit" href="#project">
                  Our Project
                </Button>
                <Button color="inherit" href="#software">
                  Our Software
                </Button>

                <Button
                  id="navbar-login"
                  color="inherit"
                  component={Link}
                  to="/login"
                >
                  Login
                </Button>
              </div>
            )}
          </Toolbar>
        </AppBar>
        {localStorage.getItem('isAuthed') && location.pathname !== '/' ? (
          <>
            <Typography
              variant="h4"
              color="textPrimary"
              className={classes.pathname}
            >
              {this.titleCase(location.pathname)}
            </Typography>
            <Divider className={classes.divider} />
          </>
        ) : (
          ''
        )}
      </>
    );
  }
}

export default withRouter(withStyles(styles)(Navbar));

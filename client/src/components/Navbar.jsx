import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { Divider } from '@material-ui/core';
import GeneralMenu from './Utilities/GeneralMenu';

const styles = {
  flex: {
    flexGrow: 1
  },
  pathname: {
    margin: '10px'
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
      <React.Fragment>
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
              <React.Fragment>
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
                    { name: 'Annotations', link: '/collection/annotations' },
                    { name: 'Concepts', link: '/collection/concepts' },
                    { name: 'Videos', link: '/collection/videos' }
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
                {localStorage.getItem('admin') ? (
                  <React.Fragment>
                    <GeneralMenu
                      id="navbar-models"
                      name="Models"
                      Link={Link}
                      items={[
                        { name: 'Create Model', link: '/models/create' },
                        { name: 'View Models', link: '/models/view' },
                        { name: 'Train Models', link: '/models/train' },
                        { name: 'Predict Models', link: '/models/predict' },
                        { name: 'Previous Models', link: '/models/runs' },
                        { name: 'AI Videos', link: '/aivideos' }
                      ]}
                    />
                    {/* <Button color="inherit" component={Link} to="/aivideos">
                      AI Videos
                    </Button> */}
                    {/* <Button color="inherit" component={Link} to="/users">
                      Users
                    </Button> */}
                  </React.Fragment>
                ) : (
                  ''
                )}
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
              </React.Fragment>
            ) : (
              <Button
                id="navbar-login"
                color="inherit"
                component={Link}
                to="/login"
              >
                Login
              </Button>
            )}
          </Toolbar>
        </AppBar>
        {localStorage.getItem('isAuthed') && location.pathname !== '/' ? (
          <Typography
            variant="h4"
            color="textPrimary"
            align="left"
            className={classes.pathname}
          >
            {this.titleCase(location.pathname)}
            <Divider />
          </Typography>
        ) : (
          ''
        )}
      </React.Fragment>
    );
  }
}

export default withRouter(withStyles(styles)(Navbar));

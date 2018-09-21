import React from 'react';
import { Link } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

const styles = {
  flex: {
    flexGrow: 1,
  },
};

class Navbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  handleClick = event => {
    this.setState({ open: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ open: false });
  };

  handleLogout = () => {
    localStorage.clear();
  };

  render() {
    const { classes } = this.props;
    return (
      <AppBar position='static'>
        <Toolbar>
          <Typography variant='title' color='inherit' className={classes.flex}>
            Video Annotation Tool
          </Typography>
          <Button color='inherit' component={Link} to='/'>
            Home
          </Button>
          {localStorage.getItem('isAuthed') ? (
            <React.Fragment>
              {localStorage.getItem('admin') ? (
                  <Button color='inherit' component={Link} to='/createUser'>
                    Create User
                  </Button>
              ):(
                <React.Fragment>
                  <Button color='inherit' component={Link} to='/concepts'>
                    Select Concepts
                  </Button>
                  <Button color='inherit' component={Link} to='/annotate'>
                    Annotate Videos
                  </Button>
                  <Button color='inherit' component={Link} to='/report'>
                    Report
                  </Button>
                </React.Fragment>
              )}
              <Button color='inherit' component={Link} to='/profile'>
                Profile
              </Button>
              <Button color='inherit' component={Link} to='/' onClick={this.handleLogout}>
                Logout
              </Button>
            </React.Fragment>
          ) : (
            <Button color='inherit' component={Link} to='/login'>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
    );
  }
}

export default withStyles(styles)(Navbar);

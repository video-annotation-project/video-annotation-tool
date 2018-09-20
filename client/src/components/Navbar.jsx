import React from 'react';
import { Link } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';

const styles = {
  flex: {
    flexGrow: 1,
  },
};

class Navbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: null
    };
  }

  handleClick = event => {
    this.setState({ open: event.currentTarget });
  };

  handleClose = (path) => {
    if ( path === 'Videos') {
      localStorage.setItem('report', 'true');
    } else {
      localStorage.setItem('report', 'false');
    }
    this.setState({ open: null });
  };

  handleLogout = () => {
    localStorage.clear();
  };

  render() {
    const { classes } = this.props;
    let { open } = this.state;
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
                  <Button
                    color='inherit'
                    aria-owns={open ? 'report-menu' : null}
                    aria-haspopup="true"
                    onClick={this.handleClick}

                  >
                  Report
                  </Button>
                  <Menu
                    id="report-menu"
                    anchorEl={open}
                    open={Boolean(open)}
                    onClose={this.handleClose}
                   >
                    <MenuItem onClick={this.handleClose.bind(this, 'Videos')} component={Link} to='/report'>Videos</MenuItem>
                    <MenuItem onClick={this.handleClose.bind(this, 'Concepts')} component={Link} to='/report'>Concepts</MenuItem>
                  </Menu>
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

import React from 'react';
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

  handleLogout = () => {
    localStorage.clear();
    this.props.history.push('/');
  };

  render() {
    const { classes, history } = this.props;
    return (
      <AppBar position='static'>
        <Toolbar>
          <Typography variant='title' color='inherit' className={classes.flex}>
            Video Annotation Tool
          </Typography>
          <Button color='inherit' onClick={() => history.push('/')}>
            Home
          </Button>
          {localStorage.getItem('isAuthed') ? (
            <React.Fragment>
              <Button color='inherit' onClick={() => history.push('/concepts')}>
                Select Concepts
              </Button>
              <Button color='inherit' onClick={() => history.push('/annotate')}>
                Annotate Videos
              </Button>
              <Button color='inherit' onClick={this.handleLogout}>
                Logout
              </Button>
            </React.Fragment>
          ) : (
            <Button color='inherit' onClick={() => history.push('/login')}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
    );
  }
}

export default withStyles(styles)(Navbar);

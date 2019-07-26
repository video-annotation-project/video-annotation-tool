import React, { Component } from 'react';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

const styles = {
  root: {
    height: '70vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 32
  }
};

class HomePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // error: null,
      // isLoaded: false,
      // errorMsg: null,
      // open: false //For error modal box
    };
  }

  render() {
    const { classes } = this.props;
    return (
      <Typography className={classes.root}>
        Welcome {localStorage.username}
      </Typography>
    );
  }
}

export default withStyles(styles)(HomePage);

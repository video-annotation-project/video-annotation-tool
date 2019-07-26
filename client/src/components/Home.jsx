import React from 'react';
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

const HomePage = props => {
  const { classes } = props;
  return (
    <Typography className={classes.root}>
      Welcome {localStorage.username}
    </Typography>
  );
};

export default withStyles(styles)(HomePage);

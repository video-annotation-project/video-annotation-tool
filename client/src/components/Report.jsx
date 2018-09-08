import React from 'react';

// import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import VideosAnnotated from './VideosAnnotated.jsx';

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  }
});

class Report extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <VideosAnnotated />
      </div>
    );
  }
}

export default withStyles(styles)(Report);

import React from 'react';

// import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

import ConceptsList from './ConceptsList.jsx';

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  }
});

class Concepts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <br />
        <ConceptsList id={-1} />
      </div>
    );
  }
}

export default withStyles(styles)(Concepts);

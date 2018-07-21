import React from 'react';
import Typography from '@material-ui/core/Typography';

import ConceptsList from './ConceptsList.jsx';

class Concepts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    return (
      <React.Fragment>
        <Typography variant='display1' gutterBottom> Concepts </Typography>
        <ConceptsList />
      </React.Fragment>
    );
  }
}

export default Concepts;

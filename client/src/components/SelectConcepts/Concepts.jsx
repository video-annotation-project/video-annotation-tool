import React from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';

import ConceptsList from './ConceptsList';

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper
  }
});

class Concepts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      conceptsSelected: {},
      error: null
    };
  }

  getConceptsSelected = async () => {
    return axios
      .get('/api/users/concepts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.data)
      .then(conceptsSelectedList => {
        const conceptsSelectedObj = {};
        conceptsSelectedList.forEach(concept => {
          conceptsSelectedObj[concept.id] = true;
        });
        return conceptsSelectedObj;
      })
      .catch(error => {
        console.log(error);
        console.log(JSON.parse(JSON.stringify(error)));
        if (!error.response) {
          return;
        }
        const errMsg =
          error.response.data.detail || error.response.data.message || 'Error';
        console.log(errMsg);
        this.setState({
          isLoaded: true,
          error: errMsg
        });
      });
  };

  componentDidMount = async () => {
    localStorage.setItem('verifyAnnotation', null);
    localStorage.setItem('curIndex', 0);
    localStorage.setItem('selectionMounted', true);
    const conceptsSelected = await this.getConceptsSelected();
    this.setState({
      isLoaded: true,
      conceptsSelected
    });
  };

  changeConceptsSelected = async id => {
    const config = {
      url: '/api/users/concepts',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: {
        id
      }
    };
    const { conceptsSelected } = this.state;
    conceptsSelected[id] = !conceptsSelected[id];
    config.method = conceptsSelected[id] ? 'post' : 'delete';
    axios
      .request(config)
      .then(res => {
        this.setState({
          conceptsSelected: JSON.parse(JSON.stringify(conceptsSelected))
        });
      })
      .catch(error => {
        console.log(error);
        if (!error.response) {
          return;
        }
        const errMsg =
          error.response.data.detail || error.response.data.message || 'Error';
        console.log(errMsg);
        this.setState({
          isLoaded: true,
          error: errMsg
        });
      });
  };

  render() {
    const { error, isLoaded, conceptsSelected } = this.state;
    const { classes } = this.props;
    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error) {
      return <List>Error: {error.message}</List>;
    }
    return (
      <div className={classes.root}>
        <br />
        <ConceptsList
          id={0}
          conceptsSelected={conceptsSelected}
          changeConceptsSelected={this.changeConceptsSelected}
        />
      </div>
    );
  }
}

export default withStyles(styles)(Concepts);

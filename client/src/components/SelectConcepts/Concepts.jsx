import React from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import { Typography } from '@material-ui/core';

import ConceptsList from './ConceptsList';
import ConceptSearchMenu from '../Utilities/ConceptSearchMenu';

const styles = theme => ({
  root: {
    width: '100%'
  },
  text: {
    margin: theme.spacing(4)
  },
  input: {
    marginBottom: theme.spacing()
  }
});

class Concepts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      conceptsSelected: {},
      conceptPath: '',
      error: null
    };
  }

  componentDidMount = async () => {
    const conceptsSelected = await this.getConceptsSelected();
    const concepts = await this.getConcepts();

    this.setState({
      isLoaded: true,
      conceptsSelected,
      concepts
    });
  };

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

  getConcepts = async () => {
    return axios
      .get(`/api/concepts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        return res.data;
      })
      .catch(error => {
        console.log('Error in get /api/concepts');
        console.log(error);
        this.setState({
          isLoaded: true,
          error
        });
        if (error.response) {
          console.log(error.response.data.detail);
        }
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
      .then(() => {
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

  handleKeyUp = async e => {
    if (e.key === 'Enter') {
      const concept = this.getConceptInfo(e.target.value);
      if (!concept) {
        return;
      }
      this.setState({
        conceptPath: await this.getConceptPath(concept.id)
      });
    }
  };

  getConceptPath = async id => {
    return axios
      .get(`/api/concepts/path/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        let path = res.data[0];
        res.data.shift();
        res.data.forEach(concept => {
          path += ` → ${concept}`;
        });
        return path;
      })
      .catch(error => {
        console.log('Error in get /api/concepts/path');
        console.log(error);
        this.setState({
          error
        });
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  searchConcepts = search => {
    const { concepts } = this.state;
    const conceptsLikeSearch = concepts.filter(concept => {
      return concept.name.match(new RegExp(search, 'i'));
    });
    return conceptsLikeSearch.slice(0, 10);
  };

  getConceptInfo = concept => {
    const { concepts } = this.state;
    const match = concepts.find(item => {
      return item.name === concept;
    });
    return match;
  };

  render() {
    const { error, isLoaded, conceptsSelected, conceptPath } = this.state;
    const { classes } = this.props;
    if (!isLoaded) {
      return <List className={classes.text}>Loading...</List>;
    }
    if (error) {
      return <List>Error: {error.message}</List>;
    }
    return (
      <div className={classes.root}>
        <div className={classes.text}>
          <ConceptSearchMenu
            classes={classes}
            handleKeyUp={this.handleKeyUp}
            searchConcepts={this.searchConcepts}
          />
          {conceptPath ? <Typography>{conceptPath}</Typography> : ''}
        </div>
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

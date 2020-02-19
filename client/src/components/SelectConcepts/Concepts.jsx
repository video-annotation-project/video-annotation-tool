import React from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import { Typography } from '@material-ui/core';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Avatar from '@material-ui/core/Avatar';
import CheckBox from '@material-ui/core/Checkbox';

import ConceptsList from './ConceptsList';
import ConceptSearchMenu from '../Utilities/ConceptSearchMenu';

const styles = theme => ({
  root: {
    width: '100%'
  },
  search: {
    margin: theme.spacing(2),
    marginTop: theme.spacing(4)
  },
  path: {
    marginTop: theme.spacing(),
    marginLeft: theme.spacing(4)
  },
  shiftRight: {
    paddingRight: theme.spacing()
  },
  nested: {
    paddingLeft: theme.spacing(2)
  }
});

class Concepts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      conceptsSelected: {},
      conceptSearched: '',
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
      const { value } = e.target;
      const concept = this.getConceptInfo(value);
      if (!concept) {
        return;
      }
      const conceptPath = await this.getConceptPath(
        this.getConceptInfo(value).id
      );

      this.setState({
        conceptSearched: this.getConceptInfo(value),
        conceptPath
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
    search = search.replace(/\\/g, '\\\\');
    const conceptsMatchID = concepts.filter(concept => {
      return concept.id.toString() === search;
    })
    const conceptsLikeSearch = concepts.filter(concept => {
      return concept.name.match(new RegExp(search, 'i'));
    });
    return conceptsMatchID.concat(conceptsLikeSearch).slice(0, 10);
  };

  getConceptInfo = concept => {
    const { concepts } = this.state;
    const match = concepts.find(item => {
      return item.id.toString() === concept || item.name === concept;
    });
    return match;
  };

  handleCheckBoxClick = (event, id) => {
    event.stopPropagation();
    this.changeConceptsSelected(id);
  };

  render() {
    const {
      error,
      isLoaded,
      conceptsSelected,
      conceptSearched,
      conceptPath
    } = this.state;
    const { classes } = this.props;

    if (!isLoaded) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    if (error) {
      return (
        <Typography style={{ margin: '20px' }}>
          Error: {error.message}
        </Typography>
      );
    }
    return (
      <div className={classes.root}>
        <div className={classes.search}>
          <ConceptSearchMenu
            handleKeyUp={this.handleKeyUp}
            searchConcepts={this.searchConcepts}
          />
          {conceptSearched ? (
            <List disablePadding className={classes.nested}>
              <ListItem>
                <Avatar
                  src={`https://cdn.deepseaannotations.com/concept_images/${conceptSearched.picture}`}
                />
                <ListItemText inset primary={conceptSearched.name} />
                <ListItemSecondaryAction className={classes.shiftRight}>
                  <CheckBox
                    checked={Boolean(conceptsSelected[conceptSearched.id])}
                    onClick={e =>
                      this.handleCheckBoxClick(e, conceptSearched.id)
                    }
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          ) : (
            ''
          )}
          {conceptPath ? (
            <Typography className={classes.path}>{conceptPath}</Typography>
          ) : (
            ''
          )}
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

import React, { Component } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Swal from 'sweetalert2';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';

import ConceptsSelected from '../Utilities/ConceptsSelected';

const styles = theme => ({
  button: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    marginLeft: theme.spacing(2)
  },
  deleteButton: {
    marginRight: '450px'
  },
  description: {
    marginLeft: theme.spacing(2)
  },
  formControl: {
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(3),
    marginLeft: theme.spacing(3),
    minWidth: 200
  },
  list: {
    marginLeft: theme.spacing(1)
  }
});

class ConceptCollection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      collections: [],
      selectedCollection: '',
      concepts: []
    };
  }

  componentDidMount() {
    return this.loadCollections();
  }

  loadCollections = callback => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios.get('/api/collections/concepts', config).then(res => {
      this.setState(
        {
          collections: res.data
        },
        callback
      );
    });
  };

  createCollection = () => {
    Swal.mixin({
      confirmButtonText: 'Next',
      showCancelButton: true,
      progressSteps: ['1', '2']
    })
      .queue([
        {
          title: 'Collection Name',
          input: 'text'
        },
        {
          title: 'Description',
          input: 'textarea'
        }
      ])
      .then(async result => {
        if (result.value) {
          const body = {
            name: result.value[0],
            description: result.value[1]
          };
          const config = {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          };
          try {
            await axios.post('/api/collections/concepts', body, config);
            Swal.fire({
              title: 'Collection Created!',
              confirmButtonText: 'Lovely!'
            });
            await this.loadCollections();
            const { collections } = this.state;
            const colCreated = collections.find(
              col => col.name === result.value[0]
            );
            this.setState({
              selectedCollection: colCreated.id,
              concepts: []
            });
          } catch (error) {
            Swal.fire(
              'Error creating collection',
              error.response.status === 400
                ? 'A collection with this name already exists'
                : '',
              'error'
            );
          }
        }
      });
  };

  deleteCollection = async id => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async result => {
      if (result.value) {
        try {
          const response = await axios.delete(
            `/api/collections/concepts/${id}`,
            config
          );
          if (response.status) {
            Swal.fire('Deleted!', 'Collection has been deleted.', 'success');
            this.loadCollections();

            this.setState({
              selectedCollection: '',
              concepts: []
            });
          }
        } catch (error) {
          Swal.fire('ERROR deleting', result.value, 'error');
        }
      }
    });
  };

  saveToCollection = (id, list) => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      concepts: list
    };
    try {
      axios
        .post(`/api/collections/concepts/${id}`, body, config)
        .then(() => {
          Swal.fire({
            title: 'Saved!',
            confirmButtonText: 'Lovely!'
          });
          this.loadCollections();
        })
        .catch(() => {
          Swal.fire('Could not insert', '', 'error');
        });
    } catch (error) {
      Swal.fire('', error, error);
    }
  };

  handleConceptClick = concept => {
    const { concepts } = this.state;
    if (
      concepts.filter(selectedConcept => {
        return selectedConcept.id === concept.id;
      }).length === 0
    ) {
      this.setState({
        concepts: concepts.concat(
          (({ id, name, picture }) => ({ id, name, picture }))(concept)
        )
      });
    }
  };

  handleRemove = concept => {
    const { concepts } = this.state;
    const conceptsLocal = concepts.filter(selected => {
      return selected !== concept;
    });
    this.setState({
      concepts: conceptsLocal
    });
  };

  handleRemoveAll = () => {
    this.setState({
      concepts: []
    });
  };

  handleUndo = () => {
    const { collections, selectedCollection } = this.state;
    const { concepts } = collections.filter(collection => {
      return collection.id === selectedCollection;
    })[0];

    this.setState({
      concepts: !concepts[0].id ? [] : concepts
    });
  };

  handleChangeCollection = event => {
    const { collections } = this.state;
    const currentCollection = collections.filter(collection => {
      return collection.id === event.target.value;
    })[0];

    this.setState({
      selectedCollection: event.target.value,
      concepts:
        !currentCollection || !currentCollection.concepts[0].id
          ? []
          : currentCollection.concepts
    });
  };

  hasNotChanged = () => {
    const { collections, selectedCollection, concepts } = this.state;
    const concepts1 = collections.filter(collection => {
      return collection.id === selectedCollection;
    })[0].concepts;

    const concepts2 = concepts;

    if (concepts1.length !== concepts2.length) return false;

    concepts1.sort((a, b) => (a.id > b.id ? 1 : -1));
    concepts2.sort((a, b) => (a.id > b.id ? 1 : -1));

    concepts1.forEach((concept, index) => {
      if (concept.id !== concepts2[index].id) return false;
    });

    // for (let i = 0; i < concepts1.length; i++) {
    //   if (concepts1[i].id !== concepts2[i].id) return false;
    // }

    return true;
  };

  render() {
    const { classes } = this.props;
    const { selectedCollection, collections, concepts } = this.state;
    return (
      <React.Fragment>
        <ConceptsSelected handleConceptClick={this.handleConceptClick} />
        <FormControl className={classes.formControl}>
          <InputLabel>Select collection</InputLabel>
          <Select
            value={selectedCollection}
            onChange={this.handleChangeCollection}
            autoWidth
          >
            <MenuItem value="">Select collection</MenuItem>
            {collections.map(collection => {
              return (
                <MenuItem key={collection.id} value={collection.id}>
                  {collection.name}
                </MenuItem>
              );
            })}
          </Select>
          {selectedCollection === '' ||
          !collections.filter(collection => {
            return collection.id === selectedCollection;
          })[0].description ? (
            ''
          ) : (
            <FormHelperText>
              {
                collections.filter(collection => {
                  return collection.id === selectedCollection;
                })[0].description
              }
            </FormHelperText>
          )}
        </FormControl>
        <div>
          <Button
            className={classes.button}
            onClick={() => this.deleteCollection(selectedCollection)}
            disabled={selectedCollection === ''}
          >
            Delete This Collection
          </Button>
          <Button className={classes.button} onClick={this.createCollection}>
            New Concept Collection
          </Button>
        </div>
        <List className={classes.list}>
          {concepts.length > 0
            ? concepts.map(concept => {
                return (
                  <ListItem key={concept.id}>
                    <Avatar
                      src={`https://cdn.deepseaannotations.com/concept_images/${concept.picture}`}
                    />
                    <ListItemText inset primary={concept.name} />
                    <IconButton
                      className={classes.deleteButton}
                      onClick={() => this.handleRemove(concept)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                );
              })
            : ''}
        </List>
        <Button
          className={classes.button}
          onClick={this.handleUndo}
          disabled={
            selectedCollection === '' ||
            this.hasNotChanged() ||
            (!collections.filter(collection => {
              return collection.id === selectedCollection;
            })[0].concepts[0].id &&
              concepts.length === 0)
          }
        >
          Undo Changes
        </Button>
        <Button
          className={classes.button}
          onClick={this.handleRemoveAll}
          disabled={concepts.length === 0}
        >
          Remove All
        </Button>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={() => {
            const conceptids = [];
            concepts.forEach(concept => {
              conceptids.push(concept.id);
            });
            this.saveToCollection(selectedCollection, conceptids);
          }}
          disabled={
            selectedCollection === '' ||
            this.hasNotChanged() ||
            (!collections.filter(collection => {
              return collection.id === selectedCollection;
            })[0].concepts[0].id &&
              concepts.length === 0)
          }
        >
          Save
        </Button>
      </React.Fragment>
    );
  }
}

ConceptCollection.protoTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(ConceptCollection);

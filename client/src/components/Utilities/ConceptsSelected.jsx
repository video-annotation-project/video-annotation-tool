import React from 'react';
import axios from 'axios';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import { withStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import { ChevronRight, Close } from '@material-ui/icons';
import SearchModal from './SearchModal';

const styles = () => ({
  root: {},
  extendDrawerButton: {
    float: 'right',
    marginTop: '5px'
  },
  drawerContent: {
    position: 'relative',
    textAlign: 'center'
  },
  retractDrawerButton: {
    position: 'absolute',
    left: 0,
    margin: '10px'
  },
  addConceptButton: {
    margin: '15px 0px 15px 0px'
  },
  conceptsList: {
    fontSize: '130%',
    display: 'flex',
    flexFlow: 'row wrap'
  },
  concept: {
    width: '50%',
    cursor: 'pointer'
  },
  deleteConceptButton: {
    float: 'right',
    height: '25px',
    width: '25px'
  },
  deleteConceptIcon: {
    fontSize: '15px'
  }
});

class ConceptsSelected extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      drawerOpen: false,
      conceptsSelected: [],
      draggedConcept: null,
      searchModalOpen: false
    };
  }

  updateSearch = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .get(`/api/concepts`, config)
      .then(res => {
        this.setState({
          concepts: res.data
        });
      })
      .catch(error => {
        console.log('Error in get /api/concepts');
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  getConceptsSelected = () => {
    axios
      .get('/api/users/concepts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        this.setState({
          isLoaded: true,
          conceptsSelected: res.data
        });
      })
      .catch(error => {
        this.setState({
          isLoaded: true
        });
        console.log(error);
      });
  };

  componentDidMount = () => {
    this.getConceptsSelected();
  };

  toggleDrawer = () => {
    const { drawerOpen } = this.state;
    this.setState({
      drawerOpen: !drawerOpen
    });
  };

  toggleSearchModal = boolean => {
    this.updateSearch();
    this.setState({
      searchModalOpen: boolean
    });
  };

  // adds a concept to conceptsSelected
  selectConcept = conceptId => {
    const body = {
      id: conceptId
    };
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .post('/api/users/concepts', body, config)
      .then(async () => {
        this.toggleSearchModal(false);
        this.getConceptsSelected();
      })
      .catch(error => {
        this.toggleSearchModal(false);
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  deleteConcept = (event, index) => {
    const { conceptsSelected } = this.state;
    event.stopPropagation();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: {
        id: conceptsSelected[index].id
      }
    };
    axios
      .delete('/api/users/concepts', config)
      .then(async () => {
        this.getConceptsSelected();
      })
      .catch(error => {
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  onDragStart = (event, index) => {
    const { conceptsSelected } = this.state;
    this.setState({
      draggedConcept: conceptsSelected[index]
    });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.currentTarget);
    event.dataTransfer.setDragImage(event.currentTarget, 20, 20);
  };

  onDragOver = index => {
    const { draggedConcept, conceptsSelected } = this.state;
    // if the concept is dragged over itself, ignore
    if (draggedConcept === conceptsSelected[index]) {
      return;
    }
    // filter out the dragged concept
    const newConceptsSelected = conceptsSelected.filter(
      concept => concept !== draggedConcept
    );
    // insert the dragged concept after the dragged over concept
    newConceptsSelected.splice(index, 0, draggedConcept);
    this.setState({
      conceptsSelected: newConceptsSelected
    });
  };

  onDragEnd = () => {
    this.setState({
      draggedConcept: null
    });
    const { conceptsSelected } = this.state;
    conceptsSelected.forEach((concept, idx) => {
      concept.conceptidx = idx;
    });
    const body = {
      conceptsSelected
    };
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    axios
      .patch('/api/users/concepts', body, config)
      .then(async () => {})
      .catch(error => {
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  onMouseEnter = event => {
    const { draggedConcept } = this.state;
    if (draggedConcept) {
      return;
    }
    event.currentTarget.style.backgroundColor = 'lightgrey';
  };

  onMouseLeave = event => {
    const { draggedConcept } = this.state;
    if (draggedConcept) {
      return;
    }
    event.currentTarget.style.backgroundColor = 'white';
  };

  render() {
    const { classes, handleConceptClick } = this.props;
    const {
      isLoaded,
      conceptsSelected,
      drawerOpen,
      searchModalOpen,
      concepts
    } = this.state;

    let drawerContent = <div />;
    if (!isLoaded) {
      drawerContent = <div>Loading...</div>;
    } else {
      drawerContent = (
        <div className={classes.drawerContent}>
          <IconButton
            className={classes.retractDrawerButton}
            onClick={() => this.toggleDrawer()}
          >
            <ChevronRight />
          </IconButton>
          <Button
            className={classes.addConceptButton}
            variant="contained"
            color="primary"
            aria-label="Add"
            onClick={() => this.toggleSearchModal(true)}
          >
            <AddIcon />
          </Button>
          <div className={classes.conceptsList}>
            {conceptsSelected.map((concept, index) => (
              // eslint-disable-next-line jsx-a11y/interactive-supports-focus
              <div
                key={concept.id}
                role="button"
                className={classes.concept}
                onClick={() => handleConceptClick(concept)}
                onKeyDown={() => handleConceptClick(concept)}
                draggable
                onDragStart={event => this.onDragStart(event, index)}
                onDragOver={() => this.onDragOver(index)}
                onDragEnd={this.onDragEnd}
                onMouseEnter={event => this.onMouseEnter(event)}
                onMouseLeave={event => this.onMouseLeave(event)}
              >
                <IconButton
                  className={classes.deleteConceptButton}
                  onClick={event => this.deleteConcept(event, index)}
                >
                  <Close className={classes.deleteConceptIcon} />
                </IconButton>
                {concept.name}
                <br />
                <img
                  src={`https://cdn.deepseaannotations.com/concept_images/${concept.picture}`}
                  alt="Could not be downloaded"
                  height="50"
                  width="50"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={classes.root}>
        <Button
          className={classes.extendDrawerButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggleDrawer()}
        >
          Concepts
        </Button>
        <div
          style={{
            height: '100%',
            width: drawerOpen ? '440px' : '0px',
            position: 'fixed',
            zIndex: 1,
            top: 0,
            right: 0,
            backgroundColor: 'white',
            overflowX: 'hidden',
            transition: '0.3s'
          }}
        >
          {drawerContent}
        </div>
        <SearchModal
          inputHandler={this.selectConcept}
          open={searchModalOpen}
          handleClose={() => this.toggleSearchModal(false)}
          concepts={concepts}
        />
      </div>
    );
  }
}

// persistent Drawer component from material.ui is buggy, so I implemented
// my own
// <Drawer
//   variant="persistent"
//   anchor="right"
//   open={this.state.drawerOpen}
//   onClose={() => this.toggleDrawer(false)}
// >
//   {drawerContent}
// </Drawer>

export default withStyles(styles)(ConceptsSelected);

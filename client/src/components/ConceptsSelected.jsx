import React from 'react';
import axios from 'axios';

import SearchModal from './SearchModal.jsx';

import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  root: {
  },
  toggleButton: {
    float: 'right',
    marginTop: '5px'
  },
  drawerContent: {
    position: 'relative',
    textAlign: 'center'
  },
  retractButton: {
    position: 'absolute',
    left: 0,
    margin: '10px',
  },
  addButton: {
  },
  conceptsList: {
    fontSize: '130%',
    display: 'flex' ,
    flexFlow: 'row wrap',
    justifyContent: 'center'
  },
  concept: {
    width: '50%',
    listStyleType: 'none',
    cursor: 'pointer',
  },
});

class ConceptsSelected extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      conceptsSelected: [],
      drawerOpen: false,
      searchModalOpen: false,
      draggedItem: null
    };
  }

  getConceptsSelected = () => {
    axios.get('/api/conceptsSelected', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => {
      this.setState({
        isLoaded: true,
        conceptsSelected: res.data
      })
    }).catch(error => {
      this.setState({
        isLoaded: true,
        error: error
      });
    });
  }

  componentDidMount = () => {
    this.getConceptsSelected();
  }

  toggleDrawer = (boolean) => {
    this.setState({
      drawerOpen: boolean
    });
  }

  toggleSearchModal = (boolean) => {
    this.setState({
      searchModalOpen: boolean
    });
  }

  // adds a concept to conceptsSelected
  selectConcept = (conceptId) => {
    const body = {
      'id': conceptId,
    }
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.post('/api/conceptsSelected', body, config).then(async res => {
      this.toggleSearchModal(false);
      this.setState({
        isLoaded: false
      });
      this.getConceptsSelected();
    }).catch(error => {
      this.toggleSearchModal(false);
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    });
  }

  onDragStart = (event, index) => {
    this.setState({
      draggedItem: this.state.conceptsSelected[index]
    });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/html", event.target.parentNode);
    event.dataTransfer.setDragImage(event.target.parentNode, 20, 20);
  }

  onDragOver = index => {
    const draggedOverItem = this.state.conceptsSelected[index];
    // if the item is dragged over itself, ignore
    if (this.state.draggedItem === draggedOverItem) {
      return;
    }
    // filter out the currently dragged item
    let items = this.state.conceptsSelected.filter(item =>
      item !== this.state.draggedItem);
    // add the dragged item after the dragged over item
    items.splice(index, 0, this.state.draggedItem);
    this.setState({
      conceptsSelected: items
    });
  };

  onDragEnd = () => {
    this.setState({
      draggedItem: null
    });
    let conceptsSelected = this.state.conceptsSelected;
    conceptsSelected.forEach((concept, idx) => {
      concept.conceptidx = idx;
    });
    const body = {
      'conceptsSelected': conceptsSelected
    }
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.patch('/api/conceptsSelected', body, config).then(async res => {
    }).catch(error => {
      this.toggleSearchModal(false);
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    });
  };

  render() {
    const { classes } = this.props;

    let drawerContent = <div></div>;
    if (!this.state.isLoaded) {
      drawerContent = <div>Loading...</div>;
    } else {
      drawerContent = (
        <div className={classes.drawerContent}>
          <IconButton
            onClick={() => this.toggleDrawer(false)}
            className={classes.retractButton}>
            <ChevronRightIcon />
          </IconButton>
          <br />
          <Button
            className={classes.addButton}
            variant="contained"
            color="primary"
            aria-label="Add"
            onClick={() => this.toggleSearchModal(true)}
          >
            <AddIcon />
          </Button>
          <div className={classes.conceptsList}>
            {this.state.conceptsSelected.map((concept, index) => (
              <li
                key={concept.id}
                className={classes.concept}
                onClick={this.props.handleConceptClick}
                onDragOver={() => this.onDragOver(index)}
              >
                {concept.name}
                <br />
                <img
                  src={"/api/conceptImages/"+concept.id}
                  alt="Could not be downloaded"
                  height="50"
                  width="50"
                  draggable
                  onDragStart={event => this.onDragStart(event, index)}
                  onDragEnd={this.onDragEnd}
                />
              </li>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={classes.root}>
        <Button
          className={classes.toggleButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggleDrawer(true)}
        >
          Toggle Concepts Selected
        </Button>
        <div style={{
          height: '100%',
          width: this.state.drawerOpen ? '440px' : '0px',
          position: 'fixed',
          zIndex: 1,
          top: 0,
          right: 0,
          backgroundColor: 'white',
          overflowX: 'hidden',
          transition: '0.3s',
        }}>
          {drawerContent}
        </div>
        <SearchModal
          inputHandler={this.selectConcept}
          open={this.state.searchModalOpen}
          handleClose={() => this.toggleSearchModal(false)}
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

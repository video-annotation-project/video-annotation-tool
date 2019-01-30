import React from 'react';
import axios from 'axios';

import SearchModal from './SearchModal.jsx';

import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import Drawer from '@material-ui/core/Drawer';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    // float: 'right',
    // padding: '10px'
  },
  toggleButton: {
    float: 'right',
    marginTop: '5px'
  },
  drawer: {
    position: 'relative',
    width: '420px',
    textAlign: 'center'
  },
  addButton: {
    // position: 'absolute',
    // right: '70px',
    // top: '-38px'
    display: 'inline-block'
  },
  conceptsList: {
    fontSize: '130%',
    display: 'flex' ,
    flexFlow: 'row wrap',
    justifyContent: 'center'
  },
  concept: {
    width: '210px',
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

  getConceptsSelected = async () => {
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

  componentDidMount = async () => {
    await this.getConceptsSelected();
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
      'checked': true
    }
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.post('/api/updateConceptsSelected', body, config).then(async res => {
      this.toggleSearchModal(false);
      this.setState({
        isLoaded: false
      });
      await this.getConceptsSelected();
    }).catch(error => {
      this.toggleSearchModal(false);
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    })
  }

  // Closes the ConceptsSelected Drawer, opens the DialogModal
  handleConceptClick = (concept) => {
    this.setState({
      drawerOpen: false
    });
    this.props.handleConceptClick(concept);
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
  };

  render() {
    const { classes } = this.props;

    let drawer = <div></div>;
    if (!this.state.isLoaded) {
      drawer = <div>Loading...</div>;
    } else {
      drawer = (
        <div className={classes.drawer}>
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
                onClick={() => this.handleConceptClick(concept)}
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
        <SearchModal
          inputHandler={this.selectConcept}
          open={this.state.searchModalOpen}
          handleClose={() => this.toggleSearchModal(false)}
        />
        <Button
          className={classes.toggleButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggleDrawer(true)}
        >
          Toggle Concepts Selected
        </Button>
        <Drawer
          anchor="right"
          open={this.state.drawerOpen}
          onClose={() => this.toggleDrawer(false)}
        >
          {drawer}
        </Drawer>
      </div>
    );
  }
}

export default withStyles(styles)(ConceptsSelected);

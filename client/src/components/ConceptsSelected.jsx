import React from 'react';
import axios from 'axios';

import SearchModal from './SearchModal.jsx';

import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    float: 'right',
    padding: '10px',
  },
  conceptsSelectedElement: {
    position: 'relative',
    width: '420px' //ayy
  },
  addButton: {
    position: 'absolute',
    right: '70px',
    top: '-38px'
  },
  conceptList: {
    fontSize: '130%',
    display: 'flex' ,
    flexFlow: 'row wrap'
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
      conceptsSelectedOpen: true,
      searchModalOpen: false
    };
  }

  getConceptsSelected = async () => {
    axios.get('/api/conceptsSelected', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => {
      let conceptsSelected = res.data;
      this.setState({
        isLoaded: true,
        conceptsSelected: conceptsSelected
      })
    })
    .catch(error => {
      this.setState({
        isLoaded: true,
        error: error
      });
    });
  }

  componentDidMount = async () => {
    await this.getConceptsSelected();
  }

  toggleConceptsSelected = () => {
    this.setState({
      conceptsSelectedOpen: !this.state.conceptsSelectedOpen
    });
  }

  openSearchModel = () => {
    this.setState({
      searchModalOpen: true
    });
  }

  closeSearchModel = () => {
    this.setState({
      searchModalOpen: false
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
    axios.post('/api/conceptsSelected', body, config).then(async res => {
      this.closeSearchModel();
      this.setState({
        isLoaded:false
      });
      await this.getConceptsSelected();
    }).catch(error => {
      this.closeSearchModel();
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    })
  }

  render() {
    const { classes } = this.props;

    let conceptsSelectedElement = <div></div>;
    if (this.state.conceptsSelectedOpen && !this.state.isLoaded) {
      conceptsSelectedElement = <div>Loading...</div>;
    }
    if (this.state.conceptsSelectedOpen && this.state.isLoaded) {
      conceptsSelectedElement = (
        <div className={classes.conceptsSelectedElement}>
          <Button
            className={classes.addButton}
            variant="contained"
            color="primary"
            aria-label="Add"
            onClick={this.openSearchModel}
          >
            <AddIcon />
          </Button>
          <div className={classes.conceptList}>
            {this.state.conceptsSelected.map((concept, index) => (
              <li
                key={index}
                className={classes.concept}
                onClick={() => this.props.handleConceptClick(concept)}
              >
                {concept.name}
                <br />
                <img
                  src={"/api/conceptImages/"+concept.id}
                  alt="Could not be downloaded"
                  height="100"
                  width="100"
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
          handleClose={this.closeSearchModel}
        />

        <Button
          className={classes.buttonn}
          variant="contained"
          color="primary"
          aria-label="Add"
          onClick={this.toggleConceptsSelected}
        >
          Toggle Concepts Selected
        </Button>

        {conceptsSelectedElement}

      </div>
    );
  }
}

export default withStyles(styles)(ConceptsSelected);

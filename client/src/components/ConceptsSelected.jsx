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
    position: 'relative'
    // width: '420px'
  },
  // headline: {
  //   width: '200px'
  // },
  button: {
    position: 'absolute',
    right: '70px',
    top: '5px'
  },
  conceptList: {
    fontSize: '130%',
    width: '420px', //ayy
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
      concepts: []
    };
  }

  getConceptsSelected = async () => {
    return axios.get('/api/conceptsSelected', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => res.data)
    .catch(error => {
      this.setState({
        isloaded: true,
        error: error
      });
    })
  }

  componentDidMount = async () => {
    let conceptsSelected = await this.getConceptsSelected();
    this.setState({
      concepts: conceptsSelected
    })
  }

  //Adds a concept to the user's conceptsSelected
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
      this.props.handleSearchClose();
      this.setState({
        isLoaded:false
      });
      let conceptsSelected = await this.getConceptsSelected();
      this.setState({
        conceptsSelected: conceptsSelected,
        isLoaded: true
      });
    }).catch(error => {
      console.log('Error: ');
      console.log(error.response.data.detail);
      this.props.handleSearchClose();
    })
  }

  handleConceptClick = (concept) => {
    this.props.handleConceptClick(concept);
  };

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <SearchModal
          inputHandler={this.selectConcept}
          open={this.props.searchModalOpen}
          handleClose={this.props.handleSearchClose}
        />

        <Typography
          className={classes.headline}
          variant="headline"
          gutterBottom
        >
          Concepts Selected
        </Typography>
        <Button
          className={classes.button}
          variant="contained"
          color="primary"
          aria-label="Add"
          onClick={this.props.addConcept}
        >
          <AddIcon />
        </Button>

        <div className={classes.conceptList}>
          {this.state.concepts.map((concept, index) => (
            <li
              key={index}
              className={classes.concept}
              onClick={this.handleConceptClick.bind(this, concept)}
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
}

export default withStyles(styles)(ConceptsSelected);

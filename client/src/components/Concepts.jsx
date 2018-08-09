import React from 'react';

import axios from 'axios';

// import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';

import ConceptsList from './ConceptsList.jsx';

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  }
});

class Concepts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      conceptsSelected: {},
      isLoaded: false,
      error: null
    };
  }

  handleCheckBoxClick = async (id, checked) => {
    this.state.conceptsSelected[id] = checked;
    let res = await this.pushSelectedConcepts(id, checked);
  };

  pushSelectedConcepts = async (id, checked) => {
    fetch('/api/selectedPush', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
      body: JSON.stringify({
        'id': id,
        'checked': checked,
      })
    }).then(res => res.json()).then(res => {
      if (res.message === "Changed") {
        alert(res.message + ": " + res.value)
      } else {
        alert(res)
      }
    })
  }

  getSelectedConcepts = async () => (
    axios.get(`/api/selected`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => (res.data))
      .catch(error => {
        this.setState({
          isloaded: true,
          error: error
        });
        return;
    })
  );

  makeObject = async (selectedConcepts) => {
    let temp = {}
    selectedConcepts.forEach(concept => {
      temp[concept.conceptid] = true;
    })
    return temp;
  }

  componentDidMount = async () => {
    let selectedConcepts = await this.getSelectedConcepts();
    let temp = await this.makeObject(selectedConcepts);
    await this.setState({conceptsSelected: temp});
    this.setState({
      isLoaded: true,
    });
  }


  render() {
    const { error, isLoaded, concepts } = this.state;
    const { classes } = this.props;

    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
      <div className={classes.root}>
        <br />
        <ConceptsList id={-1} conceptsSelected={this.state.conceptsSelected} handleCheckBoxClick={this.handleCheckBoxClick}/>
      </div>
    );
  }
}

export default withStyles(styles)(Concepts);

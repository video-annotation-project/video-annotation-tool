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
      isLoaded: false,
      conceptsSelected: {},
      error: null
    };
  }

  getSelectedConcepts = async () => {
    return axios.get('/api/conceptsSelected', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => res.data)
      .catch(error => {
        this.setState({
          isloaded: true,
          error: error
        });
    });
  };

  changeSelectedConcepts = async (id, checked) => {
    this.state.conceptsSelected[id] = checked;
    axios.post('/api/conceptsSelected', {
      'id': id,
      'checked': checked,
    }, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
    }).then(res => res.data).then(res => {
      if (res.message === "Changed") {
        alert(res.message + ": " + res.value)
      } else {
        alert(res)
      }
    }).catch(error => {
      this.setState({
        isloaded: true,
        error: error
      });
    });
  }

  makeObject = (selectedConcepts) => {
    let temp = {}
    selectedConcepts.forEach(concept => {
      temp[concept.conceptid] = true;
    })
    return temp;
  }

  componentDidMount = async () => {
    let selectedConcepts = await this.getSelectedConcepts();
    let temp = this.makeObject(selectedConcepts);
    this.setState({
      isLoaded: true,
      conceptsSelected: temp,
    });
  }

  render() {
    const { error, isLoaded } = this.state;
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
        <ConceptsList
          id={-1}
          conceptsSelected={this.state.conceptsSelected}
          handleCheckBoxClick={this.changeSelectedConcepts}
        />
      </div>
    );
  }
}

export default withStyles(styles)(Concepts);

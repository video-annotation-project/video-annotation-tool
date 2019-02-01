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

  getConceptsSelected = async () => {
    return axios.get('/api/conceptsSelected', {
        headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
      }).then(res => res.data).then(conceptsSelectedList => {
      let conceptsSelectedObj = {};
      conceptsSelectedList.forEach(concept => {
        conceptsSelectedObj[concept.conceptid] = true;
      })
      return conceptsSelectedObj;
    }).catch(error => {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      let errMsg = error.response.data.detail ||
        error.response.data.message || 'Error';
      console.log(errMsg);
      this.setState({
        isLoaded: true,
        error: errMsg
      });
    });
  };

  componentDidMount = async () => {
    let conceptsSelected = await this.getConceptsSelected();
    this.setState({
      isLoaded: true,
      conceptsSelected: conceptsSelected
    });
  }

  changeConceptsSelected = async (id) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    const body = {
      'id': id,
    }
    let conceptsSelected = JSON.parse(JSON.stringify(this.state.conceptsSelected));
    conceptsSelected[id] = !conceptsSelected[id];
    const httpRequest = conceptsSelected[id] ? axios.post : axios.delete;
    httpRequest('/api/conceptsSelected', body, config).then(res => {
      alert("Changed: " + res.data.value);
      this.setState({
        conceptsSelected: conceptsSelected
      })
    }).catch(error => {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      let errMsg = error.response.data.detail ||
        error.response.data.message || 'Error';
      console.log(errMsg);
      this.setState({
        isLoaded: true,
        error: errMsg
      });
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
          changeConceptsSelected={this.changeConceptsSelected}
        />
      </div>
    );
  }
}

export default withStyles(styles)(Concepts);

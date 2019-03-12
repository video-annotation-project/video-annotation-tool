import React, { Component } from 'react';
import axios from 'axios';

import ErrorModal from './ErrorModal.jsx';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';


const styles= {
  root: {
    height: '70vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }
};

class CreateUser extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modelsLikeSearch: [],
      models: null,
      errorMsg: null,
      errorOpen: false //modal code
    };
  }

  componentDidMount = () => {
    this.loadExistingModels();
  }

  loadExistingModels = () => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    }
    axios.get(`/api/models`, config).then(res => {
      this.setState({
        models: res.data
      })
    }).catch(error => {
      console.log('Error in get /api/models');
      console.log(error);
      if (error.response) {
        console.log(error.response.data.detail);
      }
    })
  }
  
  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      const model = this.findModel(e.target.value);
      if (model) {
        //Model exists
        //Load model
        this.loadModel(model);
      } else {
        //Model doesn't exist
        //Create new model
        this.createModel(e.target.value);
      }
    } else {
      this.searchModels(e.target.value + e.key);
    }
  }

  handleKeyDown = (e) => {
    //Backspace does not trigger handleKeyPress
    //So this will search when backspace
    if (e.keyCode === 8 || e.keyCode === 46) {
      this.searchModels(e.target.value.slice(0,-1));
    }
  }

  searchModels = (search) => {
    const modelsLikeSearch = this.state.models.filter(model => {
      return model.name.match(new RegExp(search, 'i'))
    });

    this.setState({
      modelsLikeSearch: modelsLikeSearch.slice(0, 10)
    })
  };

  findModel = (modelName) => {
    const match = this.state.models.find(model => {
      return model.name === modelName;
    });
    return match ? match.name : null;
  };

  createModel = async (modelName) => {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    };
    const body = {
      'name': modelName,
    };
    try {
      axios.post(`/api/models`, body, config).then(res => {
        alert('Created new model ' + modelName);
        this.loadExistingModels();
        this.loadModel(res.data[0].name)
      })
    } catch (error) {
      console.log("Error in post /api/models");
      if (error.response) {
        this.setState({
          errorMsg: error.response.data.detail,
          errorOpen: true
        });
      }
    }
  };

  loadModel = (model) => {
    alert('Loaded ' + model);
    console.log(model);
  }

  //Code for closing modal
  handleClose = () => {
    this.setState({ errorOpen: false });
  };

  render() {
    const { classes } = this.props;
    const {
      models,
      modelsLikeSearch, 
      errorMsg, 
      errorOpen
    } = this.state;
    if (!models) {
      return (
        <div>Loading...</div>
      )
    }
    return (
      <div className={classes.root}>
        <h1 style={{color: 'red'}}>This page is still in progress</h1>
        <Typography variant="display1">Models</Typography><br />
        <ErrorModal 
          errorMsg={errorMsg} 
          open={errorOpen} 
          handleClose={this.handleClose}
        />
        <input 
          type='text' 
          name='model' 
          onKeyPress={this.handleKeyPress}
          onKeyDown={this.handleKeyDown}
          autoFocus
          placeholder="Model Name"
          autoComplete="off"
          list="data"
        />
        <datalist id="data">
          {modelsLikeSearch.map((model) =>
            <option key={model.name} value={model.name} />
          )}
        </datalist>
      </div>
    );
  }
}

export default withStyles(styles)(CreateUser);

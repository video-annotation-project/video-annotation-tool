import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import VideoList from './VideoList.jsx';
import ErrorModal from './ErrorModal.jsx';

const styles = theme => ({
  clear: {
    clear: 'both'
  },
  welcome: {
    fontSize: '200%',
    position: 'relative',
    top: '15px',
    left: '15px',
    color: 'blue'
  }

});


class HomePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      errorMsg: null,
      open: false //For error modal box
    };
  }

  render() {
    const { classes } = this.props;

    return (
      <div>
         <ErrorModal errorMsg={this.state.errorMsg} open={this.state.open} />
         <div className = {classes.clear}></div>

         <div className= {classes.welcome}>
          Welcome Back!
         </div>
         <div className = {classes.clear}></div>
      </div>
    );
  }
}

export default withStyles(styles)(HomePage);

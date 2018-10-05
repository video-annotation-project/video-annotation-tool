import React, { Component } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  paper: {
    width: theme.spacing.unit * 50,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing.unit * 4,
    display: 'block',
    margin: 'auto',
    overflow: 'auto',
  },
});


/* 
  A pop up dialog box that prompts the user for input.
  Has the properties:
    -inputHandler: function called when user hits enter, passes the input
    -title
    -message
    -handleClose
    -open
*/
class SearchModal extends Component {
  constructor(props) {
    super(props);
    this.state = {concepts: []};
  }

  handleClose = () => {
    this.props.handleClose();
  };

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if(this.state.concepts.includes(e.target.value)){
        this.props.inputHandler(e.target.value);
      }else{
        this.handleClose();
      }
    }else{
      this.searchConcepts(e.target.value);
    }
  }
  
  //Queries database with term, expects a list of concepts. 
  //Should open a dialogue for selecting from the list (currently just selects 1st result)
  searchConcepts = (concept) => {
    fetch("/api/searchConcepts", {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
      body: JSON.stringify({
        'name': concept
      })
    }).then(res => res.json())
      .then(async res => {
        console.log(this.concepts);  
           this.setState({concepts: res});

      })
   };

  render() {
    return (
      <React.Fragment>
        <Dialog
          open={this.props.open}
          onClose={this.handleClose}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title">Add New Concept</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {this.ok}
            </DialogContentText>
            <input
              onKeyPress={this.handleKeyPress}
              autoFocus
              margin="dense"
              id="concept"
              type="text"
              placeholder="Search Concepts"
              fullWidth
              list="data"
            />
            <datalist id="data">
                {this.state.concepts.map((item) =>
                    <option value={item['name']} />
                )}
            </datalist>
          </DialogContent>
        </Dialog>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(SearchModal);

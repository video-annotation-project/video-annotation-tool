import React, { Component } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { withStyles } from '@material-ui/core/styles';

const styles = () => ({
  dialogTitle: {
    padding: 10,
    textAlign: 'center'
  }
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
    const { handleClose, inputHandler } = this.props;
    this.state = {
      conceptsLikeSearch: []
    };
    this.handleClose = handleClose;
    this.inputHandler = inputHandler;
  }

  getId = concept => {
    const { concepts } = this.props;
    const match = concepts.find(item => {
      return item.name === concept;
    });
    return match ? match.id : null;
  };

  handleClose = () => {
    this.handleClose();
  };

  handleKeyUp = e => {
    if (e.key === 'Enter') {
      if (this.getId(e.target.value)) {
        this.inputHandler(this.getId(e.target.value));
      } else {
        this.handleClose();
      }
      return;
    }
    this.searchConcepts(e.target.value);
  };

  searchConcepts = search => {
    const { concepts } = this.props;
    const conceptsLikeSearch = concepts.filter(concept => {
      return concept.name.match(new RegExp(search, 'i'));
    });

    this.setState({
      conceptsLikeSearch: conceptsLikeSearch.slice(0, 10)
    });
  };

  render() {
    const { classes, concepts, open } = this.props;
    const { conceptsLikeSearch } = this.state;

    if (!concepts) {
      return (
        <Dialog open={open} onClose={this.handleClose}>
          Loading...
        </Dialog>
      );
    }

    return (
      <div>
        <Dialog open={open} onClose={this.handleClose}>
          <DialogTitle className={classes.dialogTitle}>
            Add New Concept
          </DialogTitle>
          <DialogContent>
            <input
              onKeyUp={this.handleKeyUp}
              autoFocus
              margin="dense"
              id="concept"
              type="text"
              placeholder="Search Concepts"
              list="data"
              autoComplete="off"
            />
            <datalist id="data">
              {conceptsLikeSearch.map(item => (
                <option key={item.id} value={item.name} />
              ))}
            </datalist>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
}

export default withStyles(styles)(SearchModal);

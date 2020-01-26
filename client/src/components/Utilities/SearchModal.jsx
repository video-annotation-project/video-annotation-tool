import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { withStyles } from '@material-ui/core/styles';
import ConceptSearchMenu from './ConceptSearchMenu';

const styles = () => ({
  dialogTitle: {
    marginTop: '10px',
    textAlign: 'center'
  }
});

/*
  A pop up dialog box that prompts the user for input.
  Has the properties:
    -inputHandler: function called when user hits enter, passes the input
    -concepts: list of concepts from database
    -handleClose
    -open
*/
const SearchModal = props => {
  const { classes, inputHandler, handleClose, concepts, open } = props;
  function getId(concept) {
    const match = concepts.find(item => {
      return item.name === concept;
    });
    return match ? match.id : null;
  }

  function handleKeyUp(event) {
    if (event.key === 'Enter') {
      const id = getId(event.target.value);
      if (!id) {
        return;
      }
      inputHandler(id);
    }
  }

  function searchConcepts(search) {
    const conceptsLikeSearch = concepts.filter(concept => {
      return concept.name.match(new RegExp(search, 'i'));
    });
    return conceptsLikeSearch.slice(0, 10);
  }

  return concepts ? (
    <div>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle className={classes.dialogTitle}>Add Concept</DialogTitle>
        <DialogContent>
          <ConceptSearchMenu
            classes={classes}
            handleKeyUp={handleKeyUp}
            searchConcepts={searchConcepts}
          />
        </DialogContent>
      </Dialog>
    </div>
  ) : (
    <Dialog open={open} onClose={handleClose}>
      Loading...
    </Dialog>
  );
};

export default withStyles(styles)(SearchModal);

import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Modal from '@material-ui/core/Modal';
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

class DialogModal extends Component {

  handleClose = () => {
    this.props.handleClose();
  };

  _handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      console.log(e.target.value);
    }
  }

  render() {
    const { classes } = this.props;
    console.log(this.props.message);
    return (
      <React.Fragment>
        <Dialog
          open={this.props.open}
          onClose={this.handleClose}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title">Add Concept</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {this.props.message}
            </DialogContentText>
            <TextField
              onKeyPress={this._handleKeyPress}
              autoFocus
              margin="dense"
              id="concept"
              type="text"
              fullWidth
            />
          </DialogContent>
              </Dialog>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(DialogModal);

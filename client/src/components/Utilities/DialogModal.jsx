import React, { Component } from 'react';
import Input from '@material-ui/core/Input';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';

const styles = theme => ({
  paper: {
    width: theme.spacing(50),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(4),
    display: 'block',
    margin: 'auto',
    overflow: 'auto'
  }
});

class DialogModal extends Component {
  constructor(props) {
    super(props);
    const { unsure, comment, inputHandler, handleClose } = this.props;
    this.state = {
      unsure: unsure || false,
      comment
    };
    this.inputHandler = inputHandler;
    this.handleClose = handleClose;
  }

  handleInputKeyUp = event => {
    if (event.key === 'Enter') {
      this.handleSubmit();
      return;
    }
    this.setState({
      comment: event.target.value
    });
  };

  handleSubmit = () => {
    const { comment, unsure } = this.state;
    this.inputHandler(comment, unsure);
    this.handleClose();
  };

  handleCheckboxChange = event => {
    this.setState({ unsure: event.target.checked });
  };

  render() {
    const { handleClose, open, title, message, placeholder } = this.props;
    const { comment, unsure } = this.state;
    return (
      <Dialog
        onClose={handleClose}
        open={open}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
          <br />
          <Input
            id="dialog-input"
            onKeyUp={
              this.handleInputKeyUp
            } /* there are four options here: onKeyDown, 
            onKeyPress, onKeyUp, and onChange. onKeyDown does not have access to the
            updated event.target.value, onKeyPress does not trigger in reponse to a
            backspace, and onChange does not trigger in response to an enter. */
            autoFocus
            margin="dense"
            type="text"
            defaultValue={comment}
            placeholder={placeholder}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <FormControlLabel
            control={
              <Checkbox
                checked={unsure}
                onChange={this.handleCheckboxChange}
                value="unsure"
                color="primary"
              />
            }
            label="Unsure"
          />
          <Button onClick={this.handleClose} color="secondary">
            Cancel
          </Button>
          <Button id="submit" onClick={this.handleSubmit} color="secondary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

export default withStyles(styles)(DialogModal);

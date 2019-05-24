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

  constructor(props) {
    super(props);
    this.state = {
      unsure: false,
      comment: '',
    };
  }

  handleInputKeyUp = event => {
    if (event.key === 'Enter') {
      this.handleSubmit();
      return;
    }
    this.setState({
      comment: event.target.value
    });
  }

  handleSubmit = () => {
    this.props.inputHandler(this.state.comment, this.state.unsure);
    this.props.handleClose();
  };

  handleCheckboxChange = event => {
    this.setState({ unsure: event.target.checked });
  };

  render() {
    return (
      <Dialog
        onClose={this.props.handleClose}
        open={this.props.open}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">{this.props.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {this.props.message}
          </DialogContentText>
          <br/>
          <Input
            onKeyUp={this.handleInputKeyUp} /* there are four options here: onKeyDown, 
            onKeyPress, onKeyUp, and onChange. onKeyDown does not have access to the
            updated event.target.value, onKeyPress does not trigger in reponse to a
            backspace, and onChange does not trigger in response to an enter. */
            autoFocus
            margin="dense"
            id="concept"
            type="text"
            placeholder={this.props.placeholder}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <FormControlLabel
            control={
              <Checkbox
                checked={this.state.unsure}
                onChange={this.handleCheckboxChange}
                value="unsure"
                color="primary"
              />
            }
            label="Unsure"
          />
          <Button onClick={this.props.handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={this.handleSubmit} color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

export default withStyles(styles)(DialogModal);

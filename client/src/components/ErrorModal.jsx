import React, { Component } from 'react';
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

class ErrorModal extends Component {

  handleClose = () => {
    this.props.handleClose();
  };

  render() {
    const { classes } = this.props;

    return (
      <React.Fragment>
        <Modal
          aria-labelledby="simple-modal-title"
          aria-describedby="simple-modal-description"
          open={this.props.open}
          onClose={this.handleClose}
        >
          <div className={classes.paper}>{this.props.errorMsg}</div>
        </Modal>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(ErrorModal);

import React from 'react';

import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

import VideosAnnotated from './VideosAnnotated.jsx';

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  },
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 120,
  },
});

class Report extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      level1: '',
      level2: '',
      level3: '',
      renderTree: false
    };
  }

  handleChange = name => event => {
    this.setState({ [name]: event.target.value });
  };

  handleClickOpen = () => {
    this.setState({ open: true });
  };

  handleClose = () => {
    this.setState({
       open: false,
       renderTree: true
     });
  };
  //<VideosAnnotated />

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Button onClick={this.handleClickOpen}>Open select dialog</Button>
        <Dialog
          disableBackdropClick
          open={this.state.open}
          onClose={this.handleClose}
        >
          <DialogTitle>Select Tree Structure:</DialogTitle>
          <DialogContent>
            <form className={classes.container}>
              <FormControl className={classes.formControl}>
                <InputLabel>Level 1</InputLabel>
                <Select
                  native
                  value={this.state.level1}
                  onChange={this.handleChange('level1')}
                  input={<Input id="age-native-simple" />}
                >
                  <option value="" />
                  <option value={'Concept'}>Concept</option>
                  <option value={'Video'}>Video</option>
                </Select>
              </FormControl>
              <FormControl className={classes.formControl}>
                <InputLabel>Level 2</InputLabel>
                <Select
                  value={this.state.level2}
                  onChange={this.handleChange('level2')}
                  input={<Input id="age-simple" />}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <option value={'Concept'}>Concept</option>
                  <option value={'Video'}>Video</option>
                </Select>
              </FormControl>
              {localStorage.getItem('admin') ? (
                <FormControl className={classes.formControl}>
                  <InputLabel>Level 3</InputLabel>
                  <Select
                    value={this.state.level3}
                    onChange={this.handleChange('level3')}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    <option value={'Concept'}>Concept</option>
                    <option value={'Video'}>Video</option>
                  </Select>
                </FormControl>
              ):(
                <div></div>
              )}
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleClose} color="primary">
              Cancel
            </Button>
            <Button onClick={this.handleClose} color="primary">
              Ok
            </Button>
          </DialogActions>
        </Dialog>
        {this.state.renderTree ? (
          <VideosAnnotated/>
        ):(
          <div></div>
        )}
      </div>

    );
  }
}

Report.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Report);

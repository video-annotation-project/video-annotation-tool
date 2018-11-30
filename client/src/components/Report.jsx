import React from 'react';

import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';

import Level1 from './TreeLevel1.jsx';

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
      openReportSelector: false,
      level1: '',
      level2: '',
      level3: '',
      renderTree: false,
      options: [
        {"name":"", "selected":false},
        {"name":"Video", "selected":false},
        {"name":"Concept", "selected":false},
        {"name":"User", "selected":false}
      ],
      unsureOnly: false,
      openConcepts: false,
      searchOpen: false,
    };
  }

  componentDidMount = () => {
    if (!localStorage.getItem('admin')) {
      let tempOptions = JSON.parse(JSON.stringify(this.state.options));
      tempOptions.filter(option => option.name === "User")
                 .map(option => option.selected = true);
      this.setState({
        options: tempOptions
      });
    }
  }

  handleOptionAvailableToggle = (level, optionSelected) => {
    let tempOptions = JSON.parse(JSON.stringify(this.state.options));
    tempOptions.filter(option => option.selected === level)
               .map(option => option.selected = false);
    tempOptions.filter(option => option.name === optionSelected & "" !== optionSelected)
               .map(option => option.selected = level);
    this.setState({
      options: tempOptions
    });
  }

  handleChangeOption = name => event => {
    this.setState({ [name]: event.target.value });
    this.handleOptionAvailableToggle(name, event.target.value);
  };

  handleUnsureCheckbox = name => event => {
    this.setState({ [name]: event.target.checked });
  };

  handleReportSelectorOpen = () => {
    this.setState({
      openReportSelector: true,
      renderTree: false
    });
  };

  handleReportSelectorCancel = () => {
    this.setState({
       openReportSelector: false,
     });
  };

  handleReportSelectorOk = () => {
    this.setState({
       openReportSelector: false
     });
     if (this.state.level1 !== '') {
       this.setState({
         renderTree: true
       });
     }
  };

  toggleConceptsSelected = () => {
    this.setState({
      openConcepts: !this.state.openConcepts
    })
  }

  addConcept = () => {
    this.setState({
      searchOpen: true,
    });
  }

  handleSearchClose = () => {
    this.setState({
      searchOpen: false,
    });
  }

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Button onClick={this.handleReportSelectorOpen}>Open Report Selector</Button>
        <Dialog
          disableBackdropClick
          open={this.state.openReportSelector}
          onClose={this.handleReportSelectorCancel}
        >
          <DialogTitle>Select Tree Structure:</DialogTitle>
          <DialogContent>
            <form className={classes.container}>
              <FormControl className={classes.formControl}>
                <InputLabel>Level 1</InputLabel>
                <Select
                  native
                  value={this.state.level1}
                  onChange={this.handleChangeOption('level1')}
                >
                  {this.state.options
                    .filter(option => option.selected === false || option.selected === 'level1')
                    .map(choice => <option key={'level1'+choice.name} value={choice.name}>{choice.name}</option>)}
                </Select>
              </FormControl>
              <FormControl className={classes.formControl}>
                <InputLabel>Level 2</InputLabel>
                <Select
                  native
                  value={this.state.level2}
                  onChange={this.handleChangeOption('level2')}
                >
                  {this.state.options
                    .filter(option => option.selected === false || option.selected === 'level2')
                    .map(choice => <option key={'level1'+choice.name} value={choice.name}>{choice.name}</option>)}
                </Select>
              </FormControl>
              {localStorage.getItem('admin') ? (
                <FormControl className={classes.formControl}>
                  <InputLabel>Level 3</InputLabel>
                  <Select
                    native
                    value={this.state.level3}
                    onChange={this.handleChangeOption('level3')}
                  >
                    {this.state.options
                      .filter(option => option.selected === false || option.selected === 'level3')
                      .map(choice => <option key={'level1'+choice.name} value={choice.name}>{choice.name}</option>)}
                  </Select>
                </FormControl>
              ):(
                <div></div>
        )}
              <FormControlLabel
                control={
                  <Checkbox
                  checked={this.state.unsureOnly}
                  onChange={this.handleUnsureCheckbox('unsureOnly')}
                  value="unsureOnly"
                  color='primary'
                  />
                }
                label="Unsure Only"
              />
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleReportSelectorCancel} color="primary">
              Cancel
            </Button>
            <Button onClick={this.handleReportSelectorOk} color="primary">
              Ok
            </Button>
          </DialogActions>
        </Dialog>
        {this.state.renderTree ? (
          <Level1
            level1={this.state.level1}
            level2={this.state.level2}
            level3={this.state.level3}
            unsureOnly={this.state.unsureOnly}
            toggleConceptsSelected = {this.state.toggleConceptsSelected}
          />
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

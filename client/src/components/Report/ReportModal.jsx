import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
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
import Radio from '@material-ui/core/Radio';

const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap'
  },
  formControl: {
    margin: theme.spacing(),
    minWidth: 120
  }
});

class ReportModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      options: [
        { name: '', selected: false },
        { name: 'Video', selected: false },
        { name: 'Concept', selected: false }
      ]
    };
  }

  componentDidMount = () => {
    if (localStorage.getItem('admin')) {
      this.setState(prevState => ({
        options: [...prevState.options, { name: 'User', selected: false }]
      }));
    }
  };

  handleUnsureCheckbox = event => {
    const { setUnsureOnly } = this.props;
    setUnsureOnly(event.target.checked);
  };

  handleVerifiedCheckbox = event => {
    const { setVerifiedOnly } = this.props;
    setVerifiedOnly(event.target.checked);
  };

  handleUnverifiedCheckbox = event => {
    const { setUnverifiedOnly } = this.props;
    setUnverifiedOnly(event.target.checked);
  };

  handleOptionAvailableToggle = (level, optionSelected) => {
    const { options } = this.state;
    const tempOptions = JSON.parse(JSON.stringify(options));
    tempOptions
      .filter(option => option.selected === level)
      .map(option => (option.selected = false));
    tempOptions
      .filter(option => option.name === optionSelected && optionSelected !== '')
      .map(option => (option.selected = level));
    this.setState({
      options: tempOptions
    });
  };

  handleOptionChange = (level, event) => {
    const { setLevel } = this.props;
    setLevel(level, event.target.value);
    this.handleOptionAvailableToggle(level, event.target.value);
  };

  renderDropdown = (levelName, levelValue, options) => {
    const { classes } = this.props;
    const stateName = levelName.replace(' ', '').toLowerCase();

    return (
      <FormControl className={classes.formControl}>
        <InputLabel>{levelName}</InputLabel>
        <Select
          id={levelName.replace(' ', '-')}
          native
          value={levelValue}
          onChange={event => this.handleOptionChange(stateName, event)}
        >
          {options.map(opt =>
            opt.selected && opt.selected !== stateName ? (
              ''
            ) : (
              <option key={levelName + opt.name} value={opt.name}>
                {opt.name}
              </option>
            )
          )}
        </Select>
      </FormControl>
    );
  };

  render() {
    const {
      unsureOnly,
      verifiedCondition,
      handleVerifiedCondition,
      level1,
      level2,
      level3,
      openReportModal,
      classes,
      handleReportModalCancel,
      handleReportModalOk
    } = this.props;
    const { options } = this.state;
    return (
      <React.Fragment>
        <Dialog
          disableBackdropClick
          open={openReportModal}
          onClose={handleReportModalCancel}
        >
          <DialogTitle>Select Tree Structure:</DialogTitle>
          <DialogContent>
            <form className={classes.container}>
              {this.renderDropdown('Level 1', level1, options)}
              {this.renderDropdown('Level 2', level2, options)}

              {localStorage.getItem('admin') ? (
                this.renderDropdown('Level 3', level3, options)
              ) : (
                <div />
              )}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={unsureOnly}
                    onChange={event => this.handleUnsureCheckbox(event)}
                    value="unsureOnly"
                    color="secondary"
                  />
                }
                label="Unsure Only"
              />
              <div>
                <Radio
                  checked={verifiedCondition === 'verified only'}
                  onChange={handleVerifiedCondition}
                  value="verified only"
                  color="default"
                />
                Verified Only
                <Radio
                  checked={verifiedCondition === 'unverified only'}
                  onChange={handleVerifiedCondition}
                  value="unverified only"
                  color="default"
                />
                Unverified Only
                <Radio
                  checked={verifiedCondition === 'all'}
                  onChange={handleVerifiedCondition}
                  value="all"
                  color="default"
                />
                All
              </div>
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleReportModalCancel} color="secondary">
              Cancel
            </Button>
            <Button
              id="ok-button"
              onClick={handleReportModalOk}
              color="secondary"
            >
              Ok
            </Button>
          </DialogActions>
        </Dialog>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(ReportModal);

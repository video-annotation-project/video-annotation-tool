import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import FormControl from '@material-ui/core/FormControl';

const styles = theme => ({
  formControl: {
    marginTop: theme.spacing(2),
    maxHeight: '250px',
    overflow: 'auto'
  },
  switch: {
    marginLeft: theme.spacing(2)
  }
});

class SelectUnsure extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      disabled: false
    };
  }

  componentDidMount = async () => {
    const { getUnsure, value } = this.props;
    if (value) {
      const annotations = await getUnsure();
      this.setState({
        disabled: annotations.length === 1 && !annotations[0].unsure
      });
    }
  };

  render() {
    const { classes, value, handleChangeSwitch } = this.props;
    const { disabled } = this.state;

    return (
      <div>
        <FormControl component="fieldset" className={classes.formControl}>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  className={classes.switch}
                  checked={value}
                  onChange={handleChangeSwitch}
                  value="selectedUnsure"
                  color="primary"
                  disabled={disabled}
                />
              }
              label="Unsure Only"
            />
          </FormGroup>
        </FormControl>
      </div>
    );
  }
}

export default withStyles(styles)(SelectUnsure);

import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import FormControl from "@material-ui/core/FormControl";

const styles = theme => ({
  formControl: {
    margin: theme.spacing.unit * 3
  }
});

class VerifySelectUnsure extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      disabled: false
    };
  }

  componentDidMount = async () => {
    let annotations = await this.props.getUnsure();

    this.setState({
      disabled: (annotations.length === 1 && !annotations[0].unsure)
    });
  };

  render() {
    const { classes, value, handleChange } = this.props;

    return (
      <FormControl component="fieldset" className={classes.formControl}>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={value}
                onChange={handleChange}
                value="selectedUnsure"
                color="primary"
                disabled={this.state.disabled}
              />
            }
            label="Unsure Only"
          />
        </FormGroup>
      </FormControl>
    );
  }
}

VerifySelectUnsure.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectUnsure);

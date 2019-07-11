import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import FormControl from "@material-ui/core/FormControl";
import Typography from "@material-ui/core/Typography";

const styles = theme => ({
  formControl: {
    marginTop: theme.spacing(2),
    maxHeight: "400px",
    overflow: "auto"
  },
  switch: {
    marginLeft: theme.spacing(2)
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
      disabled: annotations.length === 1 && !annotations[0].unsure
    });
  };

  render() {
    const { classes, value, handleChangeSwitch } = this.props;

    return (
      <>
        <Typography>Select unsure</Typography>
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
                  disabled={this.state.disabled}
                />
              }
              label="Unsure Only"
            />
          </FormGroup>
        </FormControl>
      </>
    );
  }
}

VerifySelectUnsure.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectUnsure);

import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import { Checkbox } from "@material-ui/core";

const styles = theme => ({
  formControl: {
    margin: theme.spacing.unit * 3
  },
  group: {
    marginLeft: 15
  }
});

class VerifySelectUnsure extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      unsure: []
    };
  }

  componentDidMount = async () => {
    let unsure = await this.props.getUnsure();

    this.setState({
      unsure: unsure
    });
  };

  render() {
    const { classes, value, handleChange } = this.props;

    return (
      <FormControl component="fieldset" className={classes.formControl}>
        <FormGroup
          className={classes.group}
          value={value}
          onChange={handleChange}
        >
          {this.state.unsure.map(annotation => (
            <FormControlLabel
              key={annotation.unsure.toString()}
              value={annotation.unsure.toString()}
              control={<Checkbox color="primary" />}
              label={
                annotation.unsure.toString().charAt(0).toUpperCase() +
                annotation.unsure.toString().slice(1)
              }
              checked={this.props.value.includes(annotation.unsure.toString())}
            />
          ))}
        </FormGroup>
      </FormControl>
    );
  }
}

VerifySelectUnsure.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectUnsure);

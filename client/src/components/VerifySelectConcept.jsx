import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import { Checkbox } from "@material-ui/core";

const styles = theme => ({
  root: {
    display: "flex"
  },
  formControl: {
    margin: theme.spacing.unit * 3
  },
  group: {
    margin: `${theme.spacing.unit}px 0`
  }
});

class VerifySelectConcept extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      concepts: []
    };
  }

  componentDidMount = async () => {
    let concepts = await this.props.getConcepts();

    this.setState({
      concepts: concepts
    });
  };

  render() {
    const { classes, value, handleChange } = this.props;

    return (
      <div className={classes.root}>
        <FormControl component="fieldset" className={classes.formControl}>
          <FormGroup
            className={classes.group}
            value={value}
            onChange={handleChange}
          >
            <FormControlLabel
              key={-1}
              value={"-1"}
              control={<Checkbox color="primary" />}
              label="All concepts"
              checked={this.props.value.includes("-1")}
            />
            {this.state.concepts.map(concept => (
              <FormControlLabel
                key={concept.id}
                value={concept.id.toString()}
                control={<Checkbox color="primary" />}
                label={concept.name}
                checked={this.props.value.includes(concept.id.toString())}
              />
            ))}
          </FormGroup>
        </FormControl>
      </div>
    );
  }
}

VerifySelectConcept.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectConcept);

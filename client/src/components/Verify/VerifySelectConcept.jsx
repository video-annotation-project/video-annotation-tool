import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import { Checkbox, Grid } from "@material-ui/core";
import Typography from "@material-ui/core/Typography";

const styles = theme => ({
  formControl: {
    marginTop: theme.spacing.unit * 2,
    maxHeight: "400px",
    overflow: "auto"
  },
  group: {
    marginLeft: 15
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
    const { classes, value, handleChangeList } = this.props;

    return (
      <Grid container spacing={32}>
        <Grid item>
          <Typography>Select concepts</Typography>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup
              className={classes.group}
              value={value}
              onChange={handleChangeList}
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
        </Grid>
        <Grid item>
          <Typography>Select concept collections</Typography>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup
              className={classes.group}
              value={value}
              onChange={handleChangeList}
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
        </Grid>
      </Grid>
    );
  }
}

VerifySelectConcept.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectConcept);

import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormGroup from "@material-ui/core/FormGroup";
import { Checkbox } from "@material-ui/core";
import Typography from "@material-ui/core/Typography";


const styles = theme => ({
  formControl: {
    marginTop: theme.spacing(2),
    maxHeight: "400px",
    overflow: "auto"
  },
  group: {
    marginLeft: 15
  }
});

class SelectAnnotationCollection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      collections: []
    };
  }

  componentDidMount = async () => {
    let collections = await this.props.getAnnotationCollections();

    this.setState({
      collections: collections
    });
  };

  render() {
    const { classes, value, handleChangeList } = this.props;
    if (!this.state.collections) {
        return (
            <div>Loading...</div>
        )
    }

    return (
      <>
        <Typography>Select Annotation Collection</Typography>
        <FormControl component="fieldset" className={classes.formControl}>
          <FormGroup
            name="collection"
            className={classes.group}
            value={value}
            onChange={handleChangeList}
          >
            {/* <FormControlLabel
              key={-1}
              value={"-1"}
              control={<Checkbox color="primary" />}
              label="All collections"
              checked={value.includes("-1")}
            /> */}
            {this.state.collections.map(collection => (
              <FormControlLabel
                key={collection.id}
                value={collection.id.toString()}
                control={<Checkbox color="primary" />}
                label={collection.name}
                checked={this.props.value.includes(collection.id.toString())}
              />
            ))}
          </FormGroup>
        </FormControl>
      </>
    );
  }
}

SelectAnnotationCollection.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(SelectAnnotationCollection);

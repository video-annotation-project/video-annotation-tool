import React, { Component } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import ConceptsSelected from "../Utilities/ConceptsSelected";

const styles = theme => ({});

class ConceptCollection extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount = () => {};

  handleConceptClick = concept => {
    console.log(concept);
  };

  render() {
    return (
      <div>
        <ConceptsSelected />
      </div>
    );
  }
}

ConceptCollection.protoTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(ConceptCollection);

import React, { Component } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Avatar from "@material-ui/core/Avatar";

import ConceptsSelected from "../Utilities/ConceptsSelected";
import Button from "@material-ui/core/Button";

const styles = theme => ({
  button: {
    marginTop: theme.spacing.unit,
    marginLeft: theme.spacing.unit
  },
});

class ConceptCollection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      concepts: []
    };
  }

  handleConceptClick = concept => {
    let concepts = Array.from(new Set(this.state.concepts.concat(concept)));
    this.setState({
      concepts: concepts
    });
  };

  handleRemove = concept => {
    let concepts = this.state.concepts.filter(selected => {
      return selected !== concept;
    });
    this.setState({
      concepts: concepts
    });
  };

  handleRemoveAll = () => {
    this.setState({
      concepts: []
    });
  };

  render() {
    const { classes } = this.props;
    return (
      <React.Fragment>
        <ConceptsSelected handleConceptClick={this.handleConceptClick} />
        <Button
          className={classes.button}
          onClick={() => {
            this.handleRemoveAll();
          }}
        >
          Delete All
        </Button>
        <List className={classes.list}>
          {this.state.concepts.length > 0
            ? this.state.concepts.map(concept => {
                return (
                  <ListItem key={concept.id}>
                    <Avatar src={`/api/conceptImages/${concept.id}`} />
                    <ListItemText
                      inset
                      primary={concept.name}
                      secondary={concept.id}
                    />
                    <IconButton onClick={() => this.handleRemove(concept)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                );
              })
            : ""}
        </List>
      </React.Fragment>
    );
  }
}

ConceptCollection.protoTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(ConceptCollection);

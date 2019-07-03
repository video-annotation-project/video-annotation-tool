import React, { Component } from "react";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => ({
  root: {
    width: "90%"
  },
  form: {
    width: "10%"
  },
  center: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },
  container: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
  },

});

class PreviousModels extends Component {
  constructor(props) {
    super(props);
  }
    
  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <div className={classes.center}>
        Testing
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(PreviousModels);

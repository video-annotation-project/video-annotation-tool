import React from "react";
import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";

import CreateModel from "./CreateModel.jsx";
import ViewModels from "./ViewModels.jsx";
import PredictModel from "./PredictModel.jsx";
import TrainModel from "./TrainModel.jsx";
import PreviousModels from "./PreviousModels.jsx";

const styles = theme => ({
  root: {}
});

class Models extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modelMenuOpen: false,
      modelSelection: null
    };
  }

  handleClick = event => {
    this.setState({ modelMenuOpen: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ modelMenuOpen: false });
  };

  handleSelection = targetName => {
    this.handleClose();
    this.setState({
      modelSelection: targetName
    });
  };

  render() {
    const { classes } = this.props;
    const { modelMenuOpen, modelSelection } = this.state;
    let modelElement = this.props.modelElement;

    return (
      <div className={classes.root}>
        <Button id="modelButton" onClick={this.handleClick}>
          Model Menu
        </Button>
        <Menu
          id="modelMenu"
          anchorEl={() => document.getElementById("modelButton")}
          open={Boolean(modelMenuOpen)}
          onClose={this.handleClose}
        >
          <MenuItem onClick={() => this.handleSelection("create")}>
            Create New Model
          </MenuItem>
          <MenuItem onClick={() => this.handleSelection("view")}>
            View Models
          </MenuItem>
          <MenuItem onClick={() => this.handleSelection("train")}>
            Train Model
          </MenuItem>
          <MenuItem onClick={() => this.handleSelection("run")}>
            Predict Model
          </MenuItem>
          <MenuItem onClick={() => this.handleSelection("previous")}>
            Previous Models
          </MenuItem>
        </Menu>
        {modelElement}
      </div>
    );
  }
}

Models.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Models);

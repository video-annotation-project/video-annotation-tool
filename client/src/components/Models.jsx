import React from "react";

import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";

//Model components
import CreateModel from "./CreateModel.jsx";
import ViewModels from "./ViewModels.jsx";
import PredictModel from "./PredictModel.jsx";
import TrainModel from "./TrainModel.jsx";

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
    let modelElement = <div />;
    //Switch statement to set modelElement
    switch (modelSelection) {
      case "create":
        //set modelElement to create model component
        modelElement = <CreateModel />;
        break;
      case "view":
        //set modelElement to view models component
        modelElement = <ViewModels />;
        break;
      case "train":
        //set modelElement to train model component
        modelElement = <TrainModel />;
        break;
      case "run":
        //set modelElement to run model component
        modelElement = <PredictModel />;
        break;
      default:
        //set modelElement to empty div (nothing)
        modelElement = <div />;
    }
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

import React, { Component } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Collapse from "@material-ui/core/Collapse";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";
import axios from "axios";

import AnnotationsGroup from "./AnnotationsGroup.jsx";
import Annotations from "./Annotations.jsx";

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
    paddingLeft: theme.spacing.unit * 2
  }
});

class ReportTree extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      error: null,
      treeData: null,
      levelName: null
    };
  }

  componentDidMount = async () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    await this.setState({
      levelName: this.props.levels[this.props.treeDepth]
    });
    try {
      let treeData = await axios.get(
        `/api/reportTreeData?` +
          `levelName=${this.state.levelName}&` +
          `queryConditions=${this.props.queryConditions}&` +
          `unsureOnly=${this.props.unsureOnly}&` +
          `verifiedOnly=${this.props.verifiedOnly}&` +
          `unverifiedOnly=${this.props.unverifiedOnly}&` +
          `admin=${localStorage.getItem("admin")}`,
        config
      );
      this.setState({
        treeData: treeData.data,
        isLoaded: true
      });
    } catch (error) {
      console.log(error);
      console.log(JSON.parse(JSON.stringify(error)));
      if (!error.response) {
        return;
      }
      let errMsg =
        error.response.data.detail || error.response.data.message || "Error";
      console.log(errMsg);
      this.setState({
        isLoaded: true,
        error: errMsg
      });
    }
  };

  handleListClick = async name => {
    let treeData = JSON.parse(JSON.stringify(this.state.treeData));
    let selected = treeData.find(data => data.name === name);
    selected.expanded = !selected.expanded;
    this.setState({
      treeData: treeData
    });
  };

  render() {
    const { isLoaded, treeData, error } = this.state;
    const {
      classes,
      levels,
      treeDepth,
      queryConditions,
      unsureOnly
    } = this.props;
    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error) {
      return <div>Error: {error}</div>;
    }
    return (
      <List disablePadding className={classes.root}>
        {treeData.map(data => (
          <React.Fragment key={data.key}>
            <ListItem button onClick={() => this.handleListClick(data.name)}>
              <ListItemText
                primary={data.key + ": " + data.name + " count:" + data.count}
              />
              {data.expanded ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={data.expanded} timeout="auto" unmountOnExit>
              {levels[treeDepth + 1] ? (
                <ReportTree
                  treeDepth={treeDepth + 1}
                  queryConditions={
                    queryConditions +
                    " AND annotations." +
                    this.state.levelName +
                    "id=" +
                    data.key
                  }
                  levels={levels}
                  unsureOnly={unsureOnly}
                  classes={classes}
                />
              ) : data.count > 100 ? (
                <AnnotationsGroup
                  queryConditions={
                    queryConditions +
                    " AND annotations." +
                    this.state.levelName +
                    "id=" +
                    data.key
                  }
                  unsureOnly={unsureOnly}
                  count={data.count}
                />
              ) : (
                <Annotations
                  queryConditions={
                    queryConditions +
                    " AND annotations." +
                    this.state.levelName +
                    "id=" +
                    data.key
                  }
                  unsureOnly={unsureOnly}
                />
              )}
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    );
  }
}

ReportTree.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(ReportTree);

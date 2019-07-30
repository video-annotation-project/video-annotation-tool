import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import axios from 'axios';

import AnnotationsGroup from './AnnotationsGroup';
import Annotations from './Annotations';

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
    paddingLeft: theme.spacing(2)
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
    const {
      levels,
      treeDepth,
      queryConditions,
      unsureOnly,
      verifiedCondition
    } = this.props;
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    await this.setState({
      levelName: levels[treeDepth]
    });
    const { levelName } = this.state;
    try {
      // the query has to be this long or the req.query will not register. If you broke it again, please fix it here
      const treeData = await axios.get(
        `api/annotations/treeData?levelName=${levelName}&queryConditions=${queryConditions}&unsureOnly=${unsureOnly}&verifiedCondition=${verifiedCondition}&admin=${localStorage.getItem(
          'admin'
        )}`,
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
      const errMsg =
        error.response.data.detail || error.response.data.message || 'Error';
      console.log(errMsg);
      this.setState({
        isLoaded: true,
        error: errMsg
      });
    }
  };

  handleListClick = async name => {
    let { treeData } = this.state;
    treeData = JSON.parse(JSON.stringify(treeData));
    const selected = treeData.find(data => data.name === name);
    selected.expanded = !selected.expanded;
    this.setState({
      treeData
    });
  };

  renderCollapse = data => {
    const {
      levels,
      treeDepth,
      queryConditions,
      unsureOnly,
      verifiedCondition,
      classes
    } = this.props;
    const { levelName } = this.state;
    if (levels[treeDepth + 1]) {
      return (
        <ReportTree
          treeDepth={treeDepth + 1}
          queryConditions={`${queryConditions} AND annotations.${levelName}id=${data.key}`}
          levels={levels}
          unsureOnly={unsureOnly}
          classes={classes}
          verifiedCondition={verifiedCondition}
        />
      );
    }
    if (data.count > 100) {
      return (
        <AnnotationsGroup
          queryConditions={`${queryConditions} AND annotations.${levelName}id=${data.key}`}
          unsureOnly={unsureOnly}
          count={data.count}
          verifiedCondition={verifiedCondition}
        />
      );
    }
    return (
      <Annotations
        queryConditions={`${queryConditions} AND annotations.${levelName}id=${data.key}`}
        unsureOnly={unsureOnly}
        verifiedCondition={verifiedCondition}
      />
    );
  };

  render() {
    const { isLoaded, treeData, error } = this.state;
    const { classes } = this.props;

    console.log(this.state);
    console.log(this.props);
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
                primary={`${data.key}: ${data.name} count:${data.count}`}
              />
              {data.expanded ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={data.expanded} timeout="auto" unmountOnExit>
              {this.renderCollapse(data)}
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    );
  }
}

export default withStyles(styles)(ReportTree);

import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';

import Annotations from './Annotations';
import { Typography } from '@material-ui/core';

const styles = theme => ({
  icons: {
    float: 'left',
    position: 'relative',
    left: '-50px'
  },
  button: {
    margin: theme.spacing()
  },
  root: {
    backgroundColor: theme.palette.background.paper,
    paddingLeft: theme.spacing(2)
  }
});

class AnnotationsGroup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      annotationGroups: [],
      groupInterval: 100,
      isLoaded: false,
      error: null
    };
  }

  componentDidMount = async () => {
    const { count } = this.props;
    const { groupInterval } = this.state;

    const annotationGroups = [];
    for (let i = 0; i < count; i += groupInterval) {
      annotationGroups.push({ offset: i, extended: false });
    }
    this.setState({
      isLoaded: true,
      annotationGroups
    });
  };

  handleClick = offset => {
    const { annotationGroups } = this.state;

    const group = annotationGroups.find(g => g.offset === offset);
    group.expanded = !group.expanded;

    this.setState({
      annotationGroups
    });
  };

  render() {
    const { error, isLoaded, annotationGroups, groupInterval } = this.state;
    const {
      classes,
      queryConditions,
      unsureOnly,
      count,
      verifiedCondition
    } = this.props;
    if (!isLoaded) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }
    if (error) {
      return (
        <Typography style={{ margin: '20px' }}>
          Error: {error.message}
        </Typography>
      );
    }
    return (
      <>
        <List disablePadding className={classes.root}>
          {annotationGroups.map(group => (
            <React.Fragment key={group.offset}>
              <ListItem button onClick={() => this.handleClick(group.offset)}>
                <ListItemText
                  primary={`${group.offset + 1} to ${
                    parseFloat(group.offset) + groupInterval > count
                      ? count
                      : parseFloat(group.offset) + groupInterval
                  }`}
                />
                {group.expanded ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={group.expanded} timeout="auto" unmountOnExit>
                <Annotations
                  queryConditions={queryConditions}
                  queryLimit={` LIMIT ${groupInterval} OFFSET ${group.offset}`}
                  unsureOnly={unsureOnly}
                  verifiedCondition={verifiedCondition}
                />
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </>
    );
  }
}

export default withStyles(styles)(AnnotationsGroup);

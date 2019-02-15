import React, { Component } from 'react';

import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';

import Annotations from './Annotations.jsx';

const styles = theme => ({
  icons: {
    float: 'left',
    position: 'relative',
    left: '-50px'
  },
  button: {
    margin: theme.spacing.unit
  },
  root: {
    backgroundColor: theme.palette.background.paper,
    paddingLeft: theme.spacing.unit * 2,
  }
});

class AnnotationTimes extends Component {
  constructor(props) {
    super(props);
    this.state = {
      annotationGroups: [],
      groupInterval: 100,
      isLoaded: false,
      error: null,
    };
  }

  componentDidMount = async () => {
    let annotationGroups = []
    for (let i = 0; i<this.props.count;i+=this.state.groupInterval) {
      annotationGroups.push({offset: i, extended: false})
    }
    this.setState({
      isLoaded: true,
      annotationGroups: annotationGroups,
    });
  };

  handleClick = (offset) => {
    let annotationGroups = JSON.parse(JSON.stringify(this.state.annotationGroups));
    let group = annotationGroups.find(
      group => group.offset === offset
    );
    group.expanded = !group.expanded;
    this.setState({
      annotationGroups: annotationGroups
    });
  }

  render () {
    const { error, isLoaded, annotationGroups, groupInterval } = this.state;
    const { classes, queryConditions, unsureOnly } = this.props;
    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
      <React.Fragment>
        <List disablePadding className={classes.root}>
          {annotationGroups.map(group => (
            <React.Fragment key={group.offset}>
              <ListItem button
                onClick={() => this.handleClick(
                  group.offset
                )}
              >
                <ListItemText
                  primary={
                    group.offset+1+
                    ' to '+ (parseFloat(group.offset)+groupInterval)
                  }
                />
                {group.expanded ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={group.expanded} timeout='auto' unmountOnExit>
                <Annotations
                  queryConditions={queryConditions}
                  queryLimit={
                    " LIMIT "+
                    groupInterval+" OFFSET "
                    +(group.offset)
                  }
                  unsureOnly={unsureOnly}
                />
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </React.Fragment>
    );
  }
}

AnnotationTimes.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(AnnotationTimes);

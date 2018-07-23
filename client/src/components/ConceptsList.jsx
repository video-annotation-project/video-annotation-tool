import React from 'react';

import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import StarBorder from '@material-ui/icons/StarBorder';

const styles = theme => ({
  root: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.palette.background.paper,
  },
  nested: {
    paddingLeft: theme.spacing.unit * 4,
  },
});

class ConceptsList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: true,
      concepts: [
        {
          name: 'goldfish'
        },
        {
          name: 'jellyfish'
        },
        {
          name: 'sea turtle'
        }
      ],
      isLoaded: false,
      error: null,
      item: null
    };
  }

  componentDidMount() {
    fetch("/api/concepts", {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    })
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            isLoaded: true,
            item: result
          });
        },
        // Note: it's important to handle errors here instead of a catch() block
        // so that we don't swallow exceptions from actual bugs in components.
        (error) => {
          this.setState({
            isLoaded: true,
            error: error
          });
        }
      );
  }

  handleClick = () => {
    this.setState(state => ({ open: !state.open }));
  };

  render() {
    const { error, isLoaded, item } = this.state;
    const { classes } = this.props;

    if (error)  {
      return <div>Error: {error.message}</div>;
    }
    if (!isLoaded) {
      return <div>Loading...</div>;
    }
    return (
      <div className={classes.root}>
        <div>{item}</div>
        <List disablePadding>
          {this.state.concepts.map(concept => (
            <ListItem button onClick={this.handleClick}>
              <ListItemIcon>
                <StarBorder />
              </ListItemIcon>
              <ListItemText inset primary={concept.name} />
              {this.state.open ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
          ))}
          <Collapse in={this.state.open} timeout="auto" unmountOnExit>
            <List disablePadding>
              <ListItem button className={classes.nested}>
                <ListItemIcon>
                  <StarBorder />
                </ListItemIcon>
                <ListItemText inset primary="Starred" />
              </ListItem>
            </List>
          </Collapse>
        </List>
      </div>
    );
  }
}

ConceptsList.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(ConceptsList);

import React from 'react';

import axios from 'axios';

import PropTypes from 'prop-types';
import CheckBox from '@material-ui/core/Checkbox';
import Collapse from '@material-ui/core/Collapse';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import ImageIcon from '@material-ui/icons/Image';

const styles = theme => ({
  nested: {
    paddingLeft: theme.spacing.unit * 2,
  },
  shiftRight: {
    paddingRight: theme.spacing.unit * 5
  }
});

class ConceptsList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      concepts: [],
      isLoaded: false,
      error: null
    };
  }

  getChildrenConcepts = async (id) => (
    axios.get(`/api/concepts?id=${id}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => (res.data))
      .catch(error => {
      this.setState({
        isloaded: true,
        error: error
      });
      return;
    })
  );

  componentDidMount = async () => {
    let concepts = await this.getChildrenConcepts(this.props.id);
    if (!concepts) {
      return;
    }
    for (let concept of concepts) {
      concept.checked = false;
      const children = await this.getChildrenConcepts(concept.id);
      concept.expandable = (children && children.length);
      concept.expanded = false;
    }
    this.setState({
      isLoaded: true,
      concepts: concepts
    });
  }

  handleClick = (id) => {
    let concepts = JSON.parse(JSON.stringify(this.state.concepts));
    let concept = concepts.find(concept => concept.id === id);
    if (concept.expandable) {
      concept.expanded = !concept.expanded;
    }
    this.setState({
      concepts: concepts
    });
  };

  handleCheckBoxClick = (event, id) => {
    event.stopPropagation();
    let concepts = JSON.parse(JSON.stringify(this.state.concepts));
    let concept = concepts.find(concept => concept.id === id);
    concept.checked = !concept.checked;
    this.setState({
      concepts: concepts
    });
  };

  render() {
    const { error, isLoaded, concepts } = this.state;
    const { classes } = this.props;

    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
      <List disablePadding className={classes.nested}>
        {concepts.map(concept => (
          <React.Fragment key={concept.id}>
            <ListItem button onClick={() => this.handleClick(concept.id)}>
              <ListItemIcon><ImageIcon /></ListItemIcon>
              <ListItemText inset primary={concept.name} />
              <ListItemSecondaryAction className={classes.shiftRight}>
                <CheckBox
                  checked={concept.checked}
                  onClick={(e) => this.handleCheckBoxClick(e, concept.id)}
                />
              </ListItemSecondaryAction>
              {concept.expandable ?
                (concept.expanded ? <ExpandLess /> : <ExpandMore />)
              :
                <div></div>
              }
            </ListItem>
            <Collapse in={concept.expanded} timeout="auto" unmountOnExit>
              <ConceptsList classes={classes} id={concept.id} />
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    );
  }
}

ConceptsList.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(ConceptsList);

import React from 'react';
import axios from 'axios';
import Avatar from '@material-ui/core/Avatar';
import CheckBox from '@material-ui/core/Checkbox';
import Collapse from '@material-ui/core/Collapse';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';

const styles = theme => ({
  nested: {
    paddingLeft: theme.spacing(2)
  },
  shiftRight: {
    paddingRight: theme.spacing(5)
  }
});

class ConceptsList extends React.Component {
  constructor(props) {
    super(props);
    const { changeConceptsSelected } = this.props;
    this.state = {
      concepts: [],
      isLoaded: false,
      error: null
    };

    this.changeConceptsSelected = changeConceptsSelected;
  }

  getChildrenConcepts = async id => {
    return axios
      .get(`/api/concepts/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.data)
      .catch(error => {
        this.setState({
          isLoaded: true,
          error
        });
      });
  };

  componentDidMount = async () => {
    const { id } = this.props;
    const concepts = await this.getChildrenConcepts(id);
    if (!concepts) {
      return;
    }

    // disabled eslint because forEach does not work for this situation
    // eslint-disable-next-line no-restricted-syntax
    for (const concept of concepts) {
      // eslint-disable-next-line no-await-in-loop
      const children = await this.getChildrenConcepts(concept.id);
      concept.expandable = children && children.length;
      concept.expanded = false;
    }
    console.log(concepts);
    this.setState({
      isLoaded: true,
      concepts
    });
  };

  handleCheckBoxClick = (event, id) => {
    event.stopPropagation();
    this.changeConceptsSelected(id);
  };

  ternaryOpLoop = (firstif, secondif) => {
    if (firstif) {
      if (secondif) {
        return <ExpandLess />;
      }
      return <ExpandMore />;
    }
    return '';
  };

  handleConceptClick = id => {
    const { concepts } = this.state;
    const conceptsLocal = JSON.parse(JSON.stringify(concepts));
    const concept = conceptsLocal.find(con => con.id === id);
    if (concept.expandable) {
      concept.expanded = !concept.expanded;
    }
    this.setState({
      concepts: conceptsLocal
    });
  };

  render() {
    const { error, isLoaded, concepts } = this.state;
    const { classes, conceptsSelected, changeConceptsSelected } = this.props;

    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error) {
      return <List>Error: {error.message}</List>;
    }
    console.log(concepts);
    return (
      <List disablePadding className={classes.nested}>
        {concepts.map(concept => (
          <React.Fragment key={concept.id}>
            <ListItem
              button
              onClick={() => this.handleConceptClick(concept.id)}
            >
              <Avatar
                src={`https://cdn.deepseaannotations.com/concept_images/${concept.picture}`}
              />
              <ListItemText inset primary={concept.name} />
              {/* {concept.expandable ? (
                concept.expanded ? (
                  <ExpandLess />
                ) : (
                  <ExpandMore />
                )
              ) : (
                <div />
              )} */}
              {this.ternaryOpLoop(concept.expandable, concept.expanded)}
              <ListItemSecondaryAction className={classes.shiftRight}>
                <CheckBox
                  checked={Boolean(conceptsSelected[concept.id])}
                  onClick={e => this.handleCheckBoxClick(e, concept.id)}
                  color="primary"
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Collapse in={concept.expanded} timeout="auto" unmountOnExit>
              <ConceptsList
                classes={classes}
                id={concept.id}
                conceptsSelected={conceptsSelected}
                changeConceptsSelected={changeConceptsSelected}
              />
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    );
  }
}

export default withStyles(styles)(ConceptsList);

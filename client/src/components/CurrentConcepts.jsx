import React from 'react';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  leftConcepts: {
    fontSize: '150%',
    float: 'left'
  },
  rightConcepts: {
    fontSize: '150%',
    float: 'left'
  },
  conceptListElement: {
    listStyleType: 'none'
  },
});


class CurrentConcepts extends React.Component {
  handleConceptClick = (name) => {
    this.props.handleConceptClick(name);
  };

  render() {
    const { classes } = this.props;
    var concepts = ['saury', 'concept2', 'concept3', 'concept4', 'concept5', 'concept6', 'concept7', 'concept8', 'concept9', 'concept10', 'concept11', 'concept12', 'concept13', 'concept14', 'concept15', 'concept16', 'concept17', 'concept18', 'concept19', 'concept20'];
    var conceptsList = concepts.map((name) => {
      return (<li className = {classes.conceptListElement} onClick={this.handleConceptClick.bind(this, name)}>{name} <br />
             <img src = "fish1.png" alt = "Could not be downloaded" height="100" width="100" /></li>);
    })
    var leftList = [];
    var rightList = [];
    var conceptsListLength = conceptsList.length;
    for (var i = 0; i < conceptsListLength; i++) {
      if ((i % 2) === 1) {
        rightList.push(conceptsList[i]);
      } else {
        leftList.push(conceptsList[i]);
      }
    }
    return (
              <div>
                <div className = {classes.leftConcepts}>
                  <ul>{ leftList }</ul>
                </div>
                <div className = {classes.rightConcepts}>
                  <ul>{ rightList }</ul>
                </div>
              </div>
             );
  }
}

export default withStyles(styles)(CurrentConcepts);

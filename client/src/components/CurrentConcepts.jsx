import React from 'react';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  leftConcepts: {
    fontSize: '150%',
    float: 'left',
    width: '210px'
  },
  rightConcepts: {
    fontSize: '150%',
    float: 'right',
    width: '210px'
  },
  conceptListElement: {
    listStyleType: 'none',
    cursor: 'pointer',
  },
});

class CurrentConcepts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      concepts: []
    };
  }

  getConceptList = async (conceptsArr) => (
    fetch("/api/listConcepts", {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
      body: JSON.stringify({
        'conceptList': conceptsArr
      })
    }).then(res => res.json())
      .then(res => {
        return res;
      })
      .catch(error => {
        console.log(error)
        return;
      })
  );

  componentDidMount = async () => {
    const conceptsObj = this.props.conceptsSelected;
    const conceptsArr = Object.keys(conceptsObj).filter(id => conceptsObj[id]).map(Number);
    let conceptList = await this.getConceptList(conceptsArr);
    await this.setState({
      concepts: conceptList
    })
  }


  handleConceptClick = (concept) => {
    this.props.handleConceptClick(concept);
  };

  render() {
    const { classes } = this.props;

    var conceptsList = this.state.concepts.map((concept, index) => (
      <li key = {index} className = {classes.conceptListElement} onClick={this.handleConceptClick.bind(this, concept)}>{concept.name} <br />
             <img src = {"https://d1yenv1ac8fa55.cloudfront.net/concept_images/"+concept.picture} alt = "Could not be downloaded" height="100" width="100" /></li>));

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

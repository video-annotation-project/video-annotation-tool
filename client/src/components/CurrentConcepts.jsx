import React from 'react';
import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    float: 'right',
    padding: '10px',
    position: 'relative'
    // width: '420px'
  },
  // headline: {
  //   width: '200px'
  // },
  button: {
    position: 'absolute',
    right: '70px',
    top: '5px'
  },
  conceptList: {
    fontSize: '130%',
    width: '420px', //ayy
    display: 'flex' ,
    flexFlow: 'row wrap'
  },
  concept: {
    width: '210px',
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
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

    return (
      <div className={classes.root}>

        <Typography
          className={classes.headline}
          variant="headline"
          gutterBottom
        >
          Current Concepts
        </Typography>
        <Button
          className={classes.button}
          variant="contained"
          color="primary"
          aria-label="Add"
          onClick={this.props.addConcept}
        >
          <AddIcon />
        </Button>

        <div className={classes.conceptList}>
          {this.state.concepts.map((concept, index) => (
            <li
              key={index}
              className={classes.concept}
              onClick={this.handleConceptClick.bind(this, concept)}
            >
              {concept.name}
              <br />
              <img
                src={"/api/conceptImages/"+concept.id}
                alt="Could not be downloaded"
                height="100"
                width="100"
              />
            </li>
          ))}
        </div>

      </div>
    );
  }
}

export default withStyles(styles)(CurrentConcepts);

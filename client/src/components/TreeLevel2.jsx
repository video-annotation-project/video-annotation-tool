import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import axios from 'axios';
import Annotations from './Annotations.jsx';
import Level3 from './TreeLevel3.jsx';


const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
});

class TreeLevel2 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      error: null,
      level2: null,
      totalAnnotations: 0
    };
  }

  getLevel2 = async () => {
    let level2 = await axios.get(`/api/reportInfoLevel2?level1=${this.props.level1}` +
                                 `&level2=${this.props.level2}&id=${this.props.id}` +
                                 `&admin=${localStorage.getItem('admin')}`,
      {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
      });
    return level2.data;
  }

  makeObject = async (reportData) => {
    let tempList = []
    reportData.forEach(data => {
      let temp = {}
      temp['id'] = data.id;
      temp['name'] = data.name;
      temp['expanded'] = false;
      temp['count'] = '?';
      tempList.push(temp);
    })
    return tempList;
  }

  componentDidMount = async () => {
    let level2 = await this.getLevel2();
    level2 = await this.makeObject(level2);
    await this.setState({
      isLoaded: true,
      level2: level2
    });
  }

  setAnnotationCount = (id, count) => {
    let level2 = JSON.parse(JSON.stringify(this.state.level2));
    let selected = level2.find(data => data.id === id);
    selected.count = count;
    let sumAnnotations = this.state.totalAnnotations + count;
    this.setState({
      level2: level2,
      totalAnnotations: sumAnnotations
    });
    this.props.setAnnotationCount(this.props.id, this.state.totalAnnotations);
  }

  handleListClick = async (name) => {
    let level2 = JSON.parse(JSON.stringify(this.state.level2));
    let selected = level2.find(data => data.name === name);
    selected.expanded = !selected.expanded;
    this.setState({
      level2: level2
    });
  }

  render () {
    const { error, isLoaded, level2 } = this.state;
    const { classes } = this.props;
    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
      <List className={classes.root}>
        {level2.map((data, index) =>(
          <React.Fragment key={index+1}>
            <ListItem button onClick={() => this.handleListClick(data.name)}>
              <ListItemText primary={(data.id)+': '+data.name + ' Count: ' + data.count} />
              {data.expanded ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={data.expanded} timeout='auto' >
                {this.props.level3 === '' ? (
                  <Annotations level1 = {this.props.level1} level2 = {this.props.level2}
                    id = {data.id} level1Id = {this.props.id}
                    setAnnotationCount={this.setAnnotationCount} />
                ):(
                  <Level3 level1 = {this.props.level1} level2 = {this.props.level2}
                    level3 = {this.props.level3} id = {data.id} level1Id = {this.props.id}
                    setAnnotationCount={this.setAnnotationCount} />
                )}

            </Collapse>
          </React.Fragment>
        ))}
      </List>
    )
  }
}

TreeLevel2.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(TreeLevel2);
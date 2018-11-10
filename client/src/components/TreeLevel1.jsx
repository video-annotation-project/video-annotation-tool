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
import Level2 from './TreeLevel2.jsx';

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
});

class TreeLevel1 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      error: null,
      level1: null
    };
  }

  getLevel1 = async () => {
    let level1 = await axios.get(`/api/reportInfoLevel1?level1=${this.props.level1}`+
                                  `&admin=${localStorage.getItem('admin')}&unsureOnly=${this.props.unsureOnly}`,
      {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
      });
    return level1.data;
  }

  makeObject = async (reportData) => {
    let tempList = []
    reportData.forEach(data => {
      let temp = {}
      temp['id'] = data.id;
      temp['name'] = data.name;
      temp['expanded'] = false;
      tempList.push(temp);
    })
    return tempList;
  }

  componentDidMount = async () => {
    let level1 = await this.getLevel1();
    level1 = await this.makeObject(level1);
    await this.setState({
      isLoaded: true,
      level1: level1
    });
  }

  handleListClick = async (name) => {
    let level1 = JSON.parse(JSON.stringify(this.state.level1));
    let selected = level1.find(data => data.name === name);
    selected.expanded = !selected.expanded;
    this.setState({
      level1: level1
    });
  }

  render () {
    const { error, isLoaded, level1 } = this.state;
    const { classes } = this.props;
    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
      <List className={classes.root}>
        {level1.map((data, index) =>(
          <React.Fragment key={index+1}>
            <ListItem button onClick={() => this.handleListClick(data.name)}>
              <ListItemText primary={(data.id)+': '+data.name} />
              {data.expanded ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={data.expanded} timeout='auto' unmountOnExit>
                {this.props.level2 === '' ? (
                  <Annotations
                    level1={this.props.level1}
                    id={data.id}
                    handleListClick={this.handleListClick}
                    unsureOnly={this.props.unsureOnly}
                  />
                ):(
                  <Level2
                    level1 = {this.props.level1}
                    level2 = {this.props.level2}
                    level3 = {this.props.level3}
                    id = {data.id}
                    unsureOnly={this.props.unsureOnly}
                  />
                )}

            </Collapse>
          </React.Fragment>
        ))}
      </List>
    )
  }
}

TreeLevel1.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(TreeLevel1);

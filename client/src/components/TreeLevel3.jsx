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


const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
});

class TreeLevel3 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      error: null,
      level3: null,
    };
  }

  getLevel3 = async () => {
    let level3 = await axios.get(`/api/reportInfoLevel3?level1=${this.props.level1}` +
                                  `&level2=${this.props.level2}&level3=${this.props.level3}` +
                                  `&id=${this.props.id}&level1Id=${this.props.level1Id}` +
                                  `&admin=${localStorage.getItem('admin')}&unsureOnly=${this.props.unsureOnly}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    })
    return level3.data;
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
    let level3 = await this.getLevel3();
    level3 = await this.makeObject(level3);
    await this.setState({
      isLoaded: true,
      level3: level3
    });
  }

  handleListClick = async (name) => {
    let level3 = JSON.parse(JSON.stringify(this.state.level3));
    let selected = level3.find(data => data.name === name);
    selected.expanded = !selected.expanded;
    this.setState({
      level3: level3
    });
  }

  render () {
    const { error, isLoaded, level3 } = this.state;
    const { classes } = this.props;
    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
      <List className={classes.root}>
        {level3.map((data, index) =>(
          <React.Fragment key={index+1}>
            <ListItem button onClick={() => this.handleListClick(data.name)}>
              <ListItemText primary={(data.id)+': '+data.name} />
              {data.expanded ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={data.expanded} timeout='auto' unmountOnExit>
              <Annotations
                level1 = {this.props.level1}
                level2 = {this.props.level2}
                level3 = {this.props.level3}
                id = {data.id}
                level2Id = {this.props.id}
                level1Id = {this.props.level1Id}
                unsureOnly={this.props.unsureOnly}
                toggleDrawer = {this.props.toggleDrawer}
              />
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    )
  }
}

TreeLevel3.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(TreeLevel3);

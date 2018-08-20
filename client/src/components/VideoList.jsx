import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
//import Divider from '@material-ui/core/Divider';

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
});

class VideoList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videos: []
    };
  }

  componentDidMount = () => {
    fetch("/api/videoNames", {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    })
      .then(res => res.json())
      .then(res => {
        this.setState({
          videos: res.rows
        })
      })
  }

  handleVideoClick = (filename) => {
    this.props.handleVideoClick(filename);
  }

  render () {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <List component="nav">
        {this.state.videos.map((video, index) =>(
          <ListItem button key={video.id} onClick={this.handleVideoClick.bind(this, video.filename)}>
            <ListItemText primary={(index+1)+'. '+video.filename} />
          </ListItem>
        ))}
        </List>
      </div>
    );
  }
}

VideoList.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(VideoList);

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';

const styles = theme => ({
  root: {
    position: 'relative',
    float: 'right',
    width: '80%',
    maxWidth: 300,
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

  componentDidMount() {
    fetch("/api/videos", {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    })
      .then(res => res.json())
      .then(res => {
        console.log(res.rows)
        this.setState({
          videos: res.rows
        })
        console.log(this.state.videos)
      }),
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          console.log(error);
        }
  }

  /*
  <ListItem button>
    <ListItemText primary="Inbox" />
  </ListItem>
  <ListItem button>
    <ListItemText primary="Drafts" />
  </ListItem>


  */

  render () {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <List component="nav">
        {this.state.videos.map((video) =>(
          <ListItem button key={video.id}>
            <ListItemText primary={video.filename} />
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

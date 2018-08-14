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

//import Divider from '@material-ui/core/Divider';

const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,

  },
});

class Times extends Component {
  constructor(props) {
    super(props);
    this.state = {
      times: [],
      isLoaded: false,
      error: null
    };
  }

  getTimes = async (id) => {
    let times = await axios.get(`/api/getTimes?videoid=${id}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    })
    return times.data;

  };

  componentDidMount = async () => {
      let times = await this.getTimes(this.props.videoId);
      await this.setState({
        isLoaded: true,
        times: times
      });
      console.log(this.state.times);
  };
/*
  handleVideoClick = async (filename) => {
    let videos = this.state.videos;
    for (let video of videos) {
      if (video.filename == filename) {
        video.expanded = !video.expanded;
      }
    }
    await this.setState({
      videos: videos
    })
  }



  */

  render () {
    const { error, isLoaded, times } = this.state;
    const { classes } = this.props;

    if (!isLoaded) {
      return <List>Loading...</List>;
    }
    if (error)  {
      return <List>Error: {error.message}</List>;
    }
    return (
      <List className={classes.root}>
        {times.map((time, index) =>(
          <React.Fragment key={index+1}>
            <ListItem button >
              <ListItemText primary={'At time: '+time.timeinvideo + " seconds Annotated: " + time.name} />
            </ListItem>
          </React.Fragment>
        ))}
        </List>
    );
  }

}

Times.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Times);

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';


const styles = theme => ({
  root: {
    float: 'right',
    padding: '10px'
  },
  videos: {
    width: '400px',
    height: '1000px',
    padding: '15px',
    borderLeft: '1px black solid',
    overflow: 'auto'
  },
});

class VideoList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoListOpen: true,
      startedListOpen: false,
      unwatchedListOpen: false,
      watchedListOpen: false,
    };
  }

  componentDidMount = () => {
  }

  toggleList = (list) => {
    this.setState({
      [list]: !this.state[list]
    });
  }

  render () {
    const {
      classes,
      startedVideos,
      unwatchedVideos,
      watchedVideos
    } = this.props;
    const {
      startedListOpen,
      unwatchedListOpen,
      watchedListOpen
    } = this.state;

    return (
      <div className={classes.root}>
        <Button variant="contained" color="primary" onClick={() => this.toggleList("videoListOpen")}>
          Toggle Video List
        </Button>
        <div className={classes.videos} style={{display: this.state.videoListOpen ? '' : 'none'}}>
          <ListItem button onClick={() => this.toggleList("startedListOpen")}>
            <ListItemText inset primary="Started Videos" />
            {startedListOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={startedListOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {startedVideos.map(video => (
                <ListItem button key={video.id} onClick={() => this.props.handleVideoClick(video, 'startedVideos')}>
                  <ListItemText primary={video.id + '. ' + video.filename} />
                </ListItem>
              ))}
            </List>
          </Collapse>

          <ListItem button onClick={() => this.toggleList("unwatchedListOpen")}>
            <ListItemText inset primary="Unwatched Videos" />
            {unwatchedListOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={unwatchedListOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {unwatchedVideos.map(video => (
                <ListItem button key={video.id} onClick={() => this.props.handleVideoClick(video, 'unwatchedVideos')}>
                  <ListItemText primary={video.id + '. ' + video.filename} />
                </ListItem>
              ))}
            </List>
          </Collapse>

          <ListItem button onClick={() => this.toggleList("watchedListOpen")}>
            <ListItemText inset primary="Watched Videos" />
            {watchedListOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={watchedListOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {watchedVideos.map(video => (
                <ListItem button key={video.id} onClick={() => this.props.handleVideoClick(video, 'watchedVideos')}>
                  <ListItemText primary={video.id + '. ' + video.filename} />
                </ListItem>
              ))}
            </List>
          </Collapse>

        </div>
      </div>
    );
  }
}

VideoList.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(VideoList);

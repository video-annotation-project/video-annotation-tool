import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import IconButton from '@material-ui/core/IconButton';
import Description from '@material-ui/icons/Description';

import Checkbox from '@material-ui/core/Checkbox';
import VideoMetadata from './VideoMetadata';

import GeneralMenu from './GeneralMenu';

const styles = () => ({
  drawer: {
    width: '550px',
    overflow: 'auto'
  },
  toggleButton: {
    marginTop: '5px'
  },
  addButton: {
    marginTop: '10px',
    marginLeft: '20px'
  }
});

class VideoList extends Component {
  constructor(props) {
    super(props);
    const { data, insertToCollection } = this.props;
    this.state = {
      videoListOpen: false,
      startedListOpen: false,
      unwatchedListOpen: false,
      watchedListOpen: false,
      inProgressListOpen: false,
      openedVideo: null,
      checkedVideos: [],
      data
    };

    this.insertToCollection = insertToCollection;
  }

  toggle = list => {
    this.setState(prevState => ({
      [list]: !prevState[list]
    }));
  };

  // Methods for video meta data
  openVideoMetadata = (event, video) => {
    event.stopPropagation();
    this.setState({
      openedVideo: video
    });
  };

  closeVideoMetadata = () => {
    this.setState({
      openedVideo: null
    });
  };

  handleCheckbox = (name, videoid) => event => {
    event.stopPropagation();
    const { checkedVideos } = this.state;
    const index = checkedVideos.indexOf(videoid);
    if (event.target.checked && !checkedVideos.includes(videoid)) {
      checkedVideos.push(videoid);
    } else if (!event.target.checked) {
      checkedVideos.splice(index, 1);
    }
    this.setState({
      [name]: event.target.checked,
      checkedVideos
    });
  };

  handleInsert = async id => {
    const { checkedVideos } = this.state;
    this.insertToCollection(id, checkedVideos);
    this.setState({
      videoListOpen: false,
      checkedVideos: []
    });
  };

  render() {
    const {
      classes,
      handleVideoClick,
      startedVideos,
      unwatchedVideos,
      watchedVideos,
      inProgressVideos,
      collection,
      socket,
      loadVideos
    } = this.props;
    const {
      startedListOpen,
      unwatchedListOpen,
      watchedListOpen,
      inProgressListOpen,
      openedVideo,
      videoListOpen,
      data,
      checkedVideos
    } = this.state;

    return (
      <div className={classes.root}>
        <Button
          className={classes.toggleButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggle('videoListOpen')}
        >
          Toggle Video List
        </Button>

        <Drawer
          anchor="left"
          open={videoListOpen}
          onClose={() => this.toggle('videoListOpen')}
        >
          <div className={classes.drawer}>
            <ListItem button onClick={() => this.toggle('startedListOpen')}>
              <ListItemText inset primary="My In Progress Videos" />
              {startedListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={startedListOpen} timeout="auto" unmountOnExit>
              <List disablePadding>
                {startedVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    style={video.count > 1 ? { backgroundColor: 'red' } : {}}
                    onClick={() => handleVideoClick(video, 'startedVideos')}
                  >
                    {collection ? (
                      <Checkbox
                        checked={video.selected}
                        onClick={this.handleCheckbox(video.selected, video.id)}
                        value="selected"
                        color="primary"
                        inputProps={{
                          'aria-label': 'secondary checkbox'
                        }}
                      />
                    ) : (
                      ''
                    )}
                    <ListItemText primary={`${video.id}. ${video.filename}`} />
                    <IconButton
                      onClick={event => this.openVideoMetadata(event, video)}
                    >
                      <Description />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            <ListItem button onClick={() => this.toggle('unwatchedListOpen')}>
              <ListItemText inset primary="Unwatched Videos" />
              {unwatchedListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={unwatchedListOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {unwatchedVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    onClick={() => handleVideoClick(video, 'unwatchedVideos')}
                  >
                    {collection ? (
                      <Checkbox
                        checked={video.selected}
                        onClick={this.handleCheckbox(video.selected, video.id)}
                        value="selected"
                        color="primary"
                        inputProps={{
                          'aria-label': 'secondary checkbox'
                        }}
                      />
                    ) : (
                      ''
                    )}
                    <ListItemText primary={`${video.id}. ${video.filename}`} />
                    <IconButton
                      onClick={event => this.openVideoMetadata(event, video)}
                    >
                      <Description />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            <ListItem button onClick={() => this.toggle('watchedListOpen')}>
              <ListItemText inset primary="Annotated Videos" />
              {watchedListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={watchedListOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {watchedVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    onClick={() => handleVideoClick(video, 'watchedVideos')}
                  >
                    {collection ? (
                      <Checkbox
                        checked={video.selected}
                        onClick={this.handleCheckbox(video.selected, video.id)}
                        value="selected"
                        color="primary"
                        inputProps={{
                          'aria-label': 'secondary checkbox'
                        }}
                      />
                    ) : (
                      ''
                    )}
                    <ListItemText primary={`${video.id}. ${video.filename}`} />
                    <IconButton
                      onClick={event => this.openVideoMetadata(event, video)}
                    >
                      <Description />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            <ListItem button onClick={() => this.toggle('inProgressListOpen')}>
              <ListItemText inset primary="All In Progress Videos" />
              {inProgressListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={inProgressListOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {inProgressVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    onClick={() => handleVideoClick(video, 'inProgressVideos')}
                  >
                    {collection ? (
                      <Checkbox
                        checked={video.selected}
                        onClick={this.handleCheckbox(video.selected, video.id)}
                        value="selected"
                        color="primary"
                        inputProps={{
                          'aria-label': 'secondary checkbox'
                        }}
                      />
                    ) : (
                      ''
                    )}
                    <ListItemText primary={`${video.id}. ${video.filename}`} />
                    <IconButton
                      onClick={event => this.openVideoMetadata(event, video)}
                    >
                      <Description />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            {collection ? (
              <div className={classes.addButton}>
                <GeneralMenu
                  name="Add to collection"
                  variant="contained"
                  color="primary"
                  handleInsert={this.handleInsert}
                  Link={false}
                  items={data}
                  disabled={!checkedVideos[0]}
                />
              </div>
            ) : (
              ''
            )}
          </div>
        </Drawer>
        {openedVideo && (
          <VideoMetadata
            open
            handleClose={this.closeVideoMetadata}
            openedVideo={openedVideo}
            socket={socket}
            loadVideos={loadVideos}
            model={false}
          />
        )}
      </div>
    );
  }
}

export default withStyles(styles)(VideoList);

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
import { ChevronLeft } from '@material-ui/icons';
import Grid from '@material-ui/core/Grid';
import Checkbox from '@material-ui/core/Checkbox';

import VideoMetadata from './VideoMetadata';
import GeneralMenu from './GeneralMenu';

const styles = theme => ({
  drawer: {
    width: '550px',
    overflowX: 'hidden'
  },
  toggleButton: {
    marginTop: '5px'
  },
  retractDrawerButton: {
    margin: '10px'
  },
  listText: {
    marginLeft: theme.spacing()
  },
  collapse: {
    maxHeight: 450,
    overflow: 'auto'
  }
});

class VideoList extends Component {
  constructor(props) {
    super(props);
    const { insertToCollection, createCollection } = this.props;
    this.state = {
      videoListOpen: false,
      startedListOpen: false,
      unwatchedListOpen: false,
      watchedListOpen: false,
      inProgressListOpen: false,
      openedVideo: null,
      checkedVideos: []
    };

    this.insertToCollection = insertToCollection;
    this.createCollection = createCollection;
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

  handleNewCollectionModal = () => {
    this.toggle('videoListOpen');
    this.createCollection();
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
      loadVideos,
      data
    } = this.props;
    const {
      startedListOpen,
      unwatchedListOpen,
      watchedListOpen,
      inProgressListOpen,
      openedVideo,
      videoListOpen,
      checkedVideos
    } = this.state;

    return (
      <div className={classes.root}>
        <Button
          id="video-list"
          className={classes.toggleButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggle('videoListOpen')}
        >
          Videos
        </Button>

        <Drawer
          anchor="left"
          open={videoListOpen}
          onClose={() => this.toggle('videoListOpen')}
        >
          <div className={classes.drawer}>
            <Grid container alignItems="flex-end" justify="space-between">
              {collection ? (
                <Grid item xs>
                  <Grid container justify="flex-start" alignContent="center">
                    <Grid item xs={5}>
                      <div>
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
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => this.handleNewCollectionModal()}
                      >
                        New Collection
                      </Button>
                    </Grid>
                    <Grid item xs />
                  </Grid>
                </Grid>
              ) : (
                <Grid item xs />
              )}
              <Grid
                item
                xs={1}
                style={{ float: 'right' }}
                className={classes.retractDrawerButton}
              >
                <IconButton
                  id="close-video-list"
                  onClick={() => this.toggle('videoListOpen')}
                >
                  <ChevronLeft />
                </IconButton>
              </Grid>
            </Grid>
            <ListItem button onClick={() => this.toggle('startedListOpen')}>
              <ListItemText
                className={classes.listText}
                primary="My In Progress Videos"
              />
              {startedListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse
              className={classes.collapse}
              in={startedListOpen}
              timeout="auto"
              unmountOnExit
            >
              <List disablePadding>
                {startedVideos.map(video => (
                  <ListItem
                    id={`video-${video.id}`}
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
                    <ListItemText
                      className={classes.listText}
                      primary={`${video.id}. ${video.filename}`}
                    />
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
              <ListItemText
                className={classes.listText}
                primary="Unwatched Videos"
              />
              {unwatchedListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse
              className={classes.collapse}
              in={unwatchedListOpen}
              timeout="auto"
              unmountOnExit
            >
              <List component="div" disablePadding>
                {unwatchedVideos.map(video => (
                  <ListItem
                    id={`video-${video.id}`}
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
                    <ListItemText
                      className={classes.listText}
                      primary={`${video.id}. ${video.filename}`}
                    />
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
              <ListItemText
                className={classes.listText}
                primary="Annotated Videos"
              />
              {watchedListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse
              className={classes.collapse}
              in={watchedListOpen}
              timeout="auto"
              unmountOnExit
            >
              <List component="div" disablePadding>
                {watchedVideos.map(video => (
                  <ListItem
                    id={`video-${video.id}`}
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
                    <ListItemText
                      className={classes.listText}
                      primary={`${video.id}. ${video.filename}`}
                    />
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
              <ListItemText
                className={classes.listText}
                primary="All In Progress Videos"
              />
              {inProgressListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse
              className={classes.collapse}
              in={inProgressListOpen}
              timeout="auto"
              unmountOnExit
            >
              <List component="div" disablePadding>
                {inProgressVideos.map(video => (
                  <ListItem
                    id={`video-${video.id}`}
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
                    <ListItemText
                      className={classes.listText}
                      primary={`${video.id}. ${video.filename}`}
                    />
                    <IconButton
                      onClick={event => this.openVideoMetadata(event, video)}
                    >
                      <Description />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
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

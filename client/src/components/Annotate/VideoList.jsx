import React, { Component } from "react";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Drawer from "@material-ui/core/Drawer";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { withStyles } from "@material-ui/core/styles";
import Collapse from "@material-ui/core/Collapse";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";
import IconButton from "@material-ui/core/IconButton";
import Description from "@material-ui/icons/Description";

import VideoMetadata from "../Utilities/VideoMetadata.jsx";

import Checkbox from '@material-ui/core/Checkbox';
import GeneralMenu from "../Utilities/GeneralMenu";

const styles = theme => ({
  root: {
    // float: 'right',
    // padding: '10px'
  },
  drawer: {
    // height: '1000px',
    // padding: '15px',
    width: "550px",
    overflow: "auto"
  },
  toggleButton: {
    marginTop: "5px"
  },
  addButton: {
    marginTop: "10px",
    marginLeft: "20px"
  },
});

class VideoList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoListOpen: false,
      startedListOpen: false,
      unwatchedListOpen: false,
      watchedListOpen: false,
      inProgressListOpen: false,
      openedVideo: null,
      checkedVideos: []
    };
  }

  toggle = list => {
    if (list === "videoListOpen") {
      this.props.loadCollections();
      this.setState({
        checkedVideos: []
      })
    }
    this.setState({
      [list]: !this.state[list]
    });
  };

  //Methods for video meta data
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


  handleChange = (name, videoid) => event => {
    var checkedVideos = this.state.checkedVideos;
    var index = checkedVideos.indexOf(videoid);
    if (event.target.checked &&
      !checkedVideos.includes(videoid)
      ) {
      checkedVideos.push(videoid);
    }
    else if (!event.target.checked) {
      checkedVideos.splice(index, 1);
    }
    this.setState({
      ...this.state, 
      [name]: event.target.checked,
      checkedVideos: checkedVideos
    });
  }

  handleInsert = id => {
    this.toggle("videoListOpen");
    this.props.insertToCollection(id, this.state.checkedVideos)
  }

  render() {
    const {
      classes,
      handleVideoClick,
      startedVideos,
      unwatchedVideos,
      watchedVideos,
      inProgressVideos
    } = this.props;
    const {
      startedListOpen,
      unwatchedListOpen,
      watchedListOpen,
      inProgressListOpen,
      openedVideo
    } = this.state;


    return (
      <div className={classes.root}>
        <Button
          className={classes.toggleButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggle("videoListOpen")}
        >
          Toggle Video List
        </Button>

        <Drawer
          anchor="left"
          open={this.state.videoListOpen}
          onClose={() => this.toggle("videoListOpen")}
        >
          <div className={classes.drawer}>
            <ListItem button onClick={() => this.toggle("startedListOpen")}>
              <ListItemText inset primary="My In Progress Videos" />
              {startedListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={startedListOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {startedVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    style={video.count > 1 ? { backgroundColor: "red" } : {}}
                    onClick={() => handleVideoClick(video, "startedVideos")}
                  >
                    {this.props.collection ? 
                      <Checkbox
                        checked={video.selected}
                        onChange={this.handleChange(video.selected, video.id)}
                        value="selected"
                        color="primary"
                        inputProps={{
                          'aria-label': 'secondary checkbox',
                        }}
                      /> : ""
                    }
                    <ListItemText primary={video.id + ". " + video.filename} />
                    <IconButton>
                      <Description
                        onClick={event => this.openVideoMetadata(event, video)}
                      />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            <ListItem button onClick={() => this.toggle("unwatchedListOpen")}>
              <ListItemText inset primary="Unwatched Videos" />
              {unwatchedListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={unwatchedListOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {unwatchedVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    onClick={() => handleVideoClick(video, "unwatchedVideos")}
                  >
                    {this.props.collection ? 
                      <Checkbox
                        checked={video.selected}
                        onChange={this.handleChange(video.selected, video.id)}
                        value="selected"
                        color="primary"
                        inputProps={{
                          'aria-label': 'secondary checkbox',
                        }}
                      /> : ""
                    }
                    <ListItemText primary={video.id + ". " + video.filename} />
                    <IconButton>
                      <Description
                        onClick={event => this.openVideoMetadata(event, video)}
                      />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            <ListItem button onClick={() => this.toggle("watchedListOpen")}>
              <ListItemText inset primary="Annotated Videos" />
              {watchedListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={watchedListOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {watchedVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    onClick={() => handleVideoClick(video, "watchedVideos")}
                  >
                    {this.props.collection ? 
                      <Checkbox
                        checked={video.selected}
                        onChange={this.handleChange(video.selected, video.id)}
                        value="selected"
                        color="primary"
                        inputProps={{
                          'aria-label': 'secondary checkbox',
                        }}
                      /> : ""
                    }
                    <ListItemText primary={video.id + ". " + video.filename} />
                    <IconButton>
                      <Description
                        onClick={event => this.openVideoMetadata(event, video)}
                      />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            <ListItem button onClick={() => this.toggle("inProgressListOpen")}>
              <ListItemText inset primary="All In Progress Videos" />
              {inProgressListOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={inProgressListOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {inProgressVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    onClick={() => handleVideoClick(video, "inProgressVideos")}
                  >
                    {this.props.collection ? 
                      <Checkbox
                        checked={video.selected}
                        onChange={this.handleChange(video.selected, video.id)}
                        value="selected"
                        color="primary"
                        inputProps={{
                          'aria-label': 'secondary checkbox',
                        }}
                      /> : ""
                    }                    
                    <ListItemText primary={video.id + ". " + video.filename} />
                    <IconButton>
                      <Description
                        onClick={event => this.openVideoMetadata(event, video)}
                      />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
            {this.state.checkedVideos[0] ? 
              <div className={classes.addButton}>
              <GeneralMenu
                name={"Add to collection"}
                variant="contained"
                color="primary"
                handleInsert={this.handleInsert}
                Link={false}
                items={
                  this.props.data
                }
              />
              </div>
              : 
              <Button
                disabled
                variant="contained"
                color="primary"
                className={classes.addButton}
              >
                Add to collection
              </Button>
            }
          </div>
        </Drawer>
        {this.state.openedVideo && (
          <VideoMetadata
            open={
              true /* The VideoMetadata 'openness' is controlled through
              boolean logic rather than by passing in a variable as an
              attribute. This is to force VideoMetadata to unmount when it 
              closes so that its state is reset. This also prevents the 
              accidental double submission bug, by implicitly reducing 
              the transition time of VideoMetadata to zero. */
            }
            handleClose={this.closeVideoMetadata}
            openedVideo={openedVideo}
            socket={this.props.socket}
            loadVideos={this.props.loadVideos}
            model={false}
          />
        )}
      </div>
    );
  }
}

VideoList.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VideoList);

import React, { Component } from "react";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Drawer from "@material-ui/core/Drawer";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { withStyles } from "@material-ui/core/styles";

import VideoMetadata from "./VideoMetadata.jsx";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import Description from "@material-ui/icons/Description";
import axios from "axios";

import Swal from "sweetalert2";

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
  }
});

class VideoList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      aiListOpen: false,
      openedVideo: null
    };
  }

  toggle = list => {
    this.setState({
      [list]: !this.state[list]
    });
  };

  deleteAiVideo = async (video) => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      data: {
        video: video
      }
    };
    this.toggle("videoListOpen");
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.value) {
        try {
          await axios.delete("/api/aivideos", config);
          Swal.fire(
            'Deleted!',
            'Video has been deleted.',
            'success'
          )
          this.props.loadVideos();
        } catch (error) {
          Swal.fire(error, "", "error");
        }
      }
    })
  }

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

  render() {
    const {
      classes,
      handleVideoClick,
      aiVideos
    } = this.props;
    const {
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
              <List component="div" disablePadding>
                {aiVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    onClick={() => handleVideoClick(video, "aiVideos")}
                  >
                    <ListItemText primary={video.id + ". " + video.name} />
                    <IconButton>
                      <Description
                        onClick={event => this.openVideoMetadata(event, video)}
                      />
                    </IconButton>
                    <IconButton aria-label="Delete">
                      <DeleteIcon
                        onClick={() => this.deleteAiVideo(video)}
                      />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
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

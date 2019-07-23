import React, { Component } from "react";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Drawer from "@material-ui/core/Drawer";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { withStyles } from "@material-ui/core/styles";

import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import Description from "@material-ui/icons/Description";
import axios from "axios";

import Summary from "../Utilities/Summary.jsx";
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

class AIvideoList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      aiListOpen: false,
      openedVideo: null,
      descriptionOpen: false,
      summary: null,
      metrics: null
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
          await axios.delete("/api/videos/aivideos", config);
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
    });
  }

  openVideoSummary = async (event, video) => {
    event.stopPropagation();

    this.setState({
      descriptionOpen: true,
      summary: await this.getSummary(video),
      metrics: await this.getMetrics(video)
    });
  };

  closeVideoSummary = () => {
    this.setState({
      descriptionOpen: false,
      summary: null,
      metrics: null
    });
  };

  getMetrics = async video => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    try {
      let metrics = await axios.get(`/api/videos/aivideos/metrics?filename=${video.name}`, config);
      if (metrics) {
        return metrics.data;
      }
    } catch (error) {
      console.log("Error in summary.jsx get /api/videos/aivideos/metrics");
      console.log(error.response.data);
    }
  }

  getSummary = async video => {
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    try {
      var summary = await axios.get("/api/videos/aivideos/summary/" + video.name, config)

      if (summary) {
        return summary;
      }
    } catch (error) {
        console.log("Error in summary.jsx get /api/videos/aivideos/summary");
        console.log(error.response.data);
    };
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

  render() {
    const {
      classes,
      handleVideoClick,
      aiVideos
    } = this.props;

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
              <List disablePadding>
                {aiVideos.map(video => (
                  <ListItem
                    button
                    key={video.id}
                    onClick={() => handleVideoClick(video, "aiVideos")}
                  >
                    <ListItemText primary={video.id + ". " + video.name} />
                    <IconButton
                      onClick={event => this.openVideoSummary(event, video)}
                    >
                      <Description/>
                    </IconButton>
                    <IconButton
                      aria-label="Delete"
                      onClick={() => this.deleteAiVideo(video)}
                    >
                      <DeleteIcon/>
                    </IconButton>
                  </ListItem>
                ))}
              </List>
          </div>
        </Drawer>
        {this.state.descriptionOpen && (
            <Summary
              open={
                true /* The 'openness' is controlled through
              boolean logic rather than by passing in a variable as an
              attribute. This is to force Summary to unmount when it 
              closes so that its state is reset. This also prevents the 
              accidental double submission bug, by implicitly reducing 
              the transition time of Summary to zero. */
              }
              handleClose={this.closeVideoSummary}
              summary={this.state.summary}
              aiSummary={true}
              metrics={this.state.metrics}
            />
          )}
      </div>
    );
  }
}

AIvideoList.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(AIvideoList);

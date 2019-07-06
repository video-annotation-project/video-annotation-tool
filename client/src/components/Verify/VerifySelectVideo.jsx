import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Checkbox from "@material-ui/core/Checkbox";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import { Grid, Typography } from "@material-ui/core";

const styles = theme => ({
  formControl: {
    margin: theme.spacing.unit * 3,
    maxHeight: "400px",
    overflow: "auto"
  },
  group: {
    marginLeft: 15
  }
});

class VerifySelectVideo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      videos: [],
      videoCollections: [],
      loaded: false
    };
  }

  componentDidMount = async () => {
    let videos = await this.props.getVideos();
    let videoCollections = await this.props.getVideoCollections();

    this.setState({
      videos: videos,
      videoCollections: videoCollections,
      loaded: true
    });
  };

  render() {
    const { classes, selectedVideos, selectedVideoCollections, handleChangeVideo, handleChangeVideoCollection } = this.props;

    return (
      <Grid container spacing={24}>
        <Grid item xs={3}>
          <Typography>Select videos</Typography>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup
              className={classes.group}
              value={selectedVideos}
              onChange={handleChangeVideo}
            >
              {!this.state.loaded ? (
                "Loading..."
              ) : this.state.videos.length === 0 ? (
                <Typography>No videos for current selection</Typography>
              ) : (
                <React.Fragment>
                  <FormControlLabel
                    key={-1}
                    value={"-1"}
                    control={<Checkbox color="primary" />}
                    label="All videos"
                    checked={selectedVideos.includes("-1")}
                  />
                  {this.state.videos.map(video => (
                    <FormControlLabel
                      key={video.id}
                      value={video.id.toString()}
                      control={<Checkbox color="primary" />}
                      label={video.id + " " + video.filename}
                      checked={selectedVideos.includes(video.id.toString())}
                    />
                  ))}
                </React.Fragment>
              )}
            </FormGroup>
          </FormControl>
        </Grid>
        <Grid item xs={3}>
          <Typography>Select video collections</Typography>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup
              className={classes.group}
              value={selectedVideoCollections}
              onChange={handleChangeVideoCollection}
            >
              {!this.state.loaded ? (
                "Loading..."
              ) : this.state.videoCollections.length === 0 ? (
                <Typography>No video collections for current selection</Typography>
              ) : (
                <React.Fragment>
                  {this.state.videoCollections.map(videoCollection => (
                    <FormControlLabel
                      key={videoCollection.id}
                      value={videoCollection.id.toString()}
                      control={<Checkbox color="primary" />}
                      label={videoCollection.name}
                      checked={selectedVideoCollections.includes(videoCollection.id.toString())}
                    />
                  ))}
                </React.Fragment>
              )}
            </FormGroup>
          </FormControl>
        </Grid>
      </Grid>
    );
  }
}

VerifySelectVideo.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectVideo);

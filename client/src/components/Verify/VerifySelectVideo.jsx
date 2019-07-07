import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Checkbox from "@material-ui/core/Checkbox";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import { Grid, Typography } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import ListItem from "@material-ui/core/ListItem";
import List from "@material-ui/core/List";

const styles = theme => ({
  button: {
    textTransform: "none"
  },
  formControl: {
    marginTop: theme.spacing.unit * 2,
    maxHeight: "400px",
    overflow: "auto"
  },
  group: {
    marginLeft: 15
  },
  list: {
    marginTop: theme.spacing.unit * 2,
    overflow: "auto",
    maxHeight: (400 - theme.spacing.unit * 2).toString() + "px"
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

    console.log(videoCollections);

    this.setState({
      videos: videos,
      videoCollections: videoCollections,
      loaded: true
    });
  };

  render() {
    const { classes, selectedVideos, handleChange } = this.props;

    return (
      <Grid container spacing={32}>
        <Grid item>
          <Typography>Select videos</Typography>
          <FormControl className={classes.formControl}>
            <FormGroup
              className={classes.group}
              value={selectedVideos}
              onChange={handleChange}
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
        <Grid item>
          <Typography>Select video collections</Typography>
          <List className={classes.list}>
            {this.state.videoCollections.map(videoCollection => (
              <ListItem key={videoCollection.id}>
                <Button
                  className={classes.button}
                  variant="outlined"
                  value={videoCollection.id.toString()}
                  onClick={() => {
                    if (videoCollection.videos[0]) {
                      let videoids = [];
                      this.state.videos.forEach(video => {
                        if (videoCollection.videos.includes(video.id)) {
                          videoids.push(video.id.toString());
                        }
                      });
                      this.props.handleAdd(videoids)
                    }
                  }}
                >
                  {videoCollection.name}
                </Button>
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    );
  }
}

VerifySelectVideo.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectVideo);

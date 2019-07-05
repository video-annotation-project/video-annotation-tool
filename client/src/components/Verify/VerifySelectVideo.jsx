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
      loaded: false
    };
  }

  componentDidMount = async () => {
    let videos = await this.props.getVideos();

    this.setState({
      videos: videos,
      loaded: true
    });
  };

  render() {
    const { classes, value, handleChange } = this.props;

    return (
      <Grid container spacing={24}>
        <Grid item xs={3}>
          <Typography>Select videos</Typography>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup
              aria-label="Video"
              name="video"
              className={classes.group}
              value={value}
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
                    checked={this.props.value.includes("-1")}
                  />
                  {this.state.videos.map(video => (
                    <FormControlLabel
                      key={video.id}
                      value={video.id.toString()}
                      control={<Checkbox color="primary" />}
                      label={video.id + " " + video.filename}
                      checked={this.props.value.includes(video.id.toString())}
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
              aria-label="Video"
              name="video"
              className={classes.group}
              value={value}
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
                    checked={this.props.value.includes("-1")}
                  />
                  {this.state.videos.map(video => (
                    <FormControlLabel
                      key={video.id}
                      value={video.id.toString()}
                      control={<Checkbox color="primary" />}
                      label={video.id + " " + video.filename}
                      checked={this.props.value.includes(video.id.toString())}
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

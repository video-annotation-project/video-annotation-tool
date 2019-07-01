import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Checkbox from "@material-ui/core/Checkbox";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import { Typography } from "@material-ui/core";

const styles = theme => ({
  formControl: {
    margin: theme.spacing.unit * 3,
    maxHeight: "500px",
    overflow: "auto"
  },
  group: {
    margin: `${theme.spacing.unit}px 0`
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
    );
  }
}

VerifySelectVideo.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectVideo);

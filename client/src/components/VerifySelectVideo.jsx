import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";

const styles = theme => ({
  root: {
    display: "flex"
  },
  formControl: {
    margin: theme.spacing.unit * 3
  },
  group: {
    margin: `${theme.spacing.unit}px 0`
  }
});

class VerifySelectVideo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      error: null,
      videos: []
    };
  }

  handleGetVideos = async () => {
    let videos = await this.props.getVideosByUser();

    if (!videos) {
      return;
    }

    this.setState({
      isLoaded: true,
      videos: videos
    });
  };

  componentDidMount = () => this.handleGetVideos();

  render() {
    const { classes, value, handleChange } = this.props;

    return (
      <div className={classes.root}>
        <FormControl component="fieldset" className={classes.formControl}>
          <RadioGroup
            aria-label="Video"
            name="video"
            className={classes.group}
            value={value}
            onChange={handleChange}
          >
            {this.state.videos.map(video => (
              <FormControlLabel
                key={video.id}
                value={video.filename}
                control={<Radio />}
                label={video.filename}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </div>
    );
  }
}

VerifySelectVideo.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectVideo);

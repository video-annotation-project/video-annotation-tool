import React, { Component } from "react";
import axios from "axios";

import { withStyles } from "@material-ui/core/styles";
import LinearProgress from "@material-ui/core/LinearProgress";
import { Typography } from "@material-ui/core";

const styles = theme => ({
  trainStatus: {
    marginBottom: 0
  },
  progressBar: {
    height: "8px"
  },
  progressText: {
    marginBottom: "5px"
  }
});

class PredictProgress extends Component {
  constructor(props) {
    super(props);

    this.state = {
      running: false
    };

    this.loadProgressInfo();
    this.loadProgressInfo = this.loadProgressInfo.bind(this);
  }

  componentDidMount() {
    this.interval = setInterval(() => this.loadProgressInfo(), 500);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  loadProgressInfo = async () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    try {
      let ret = await axios.get(`/api/models/progress/predict`, config);
      if (ret) {
        var data = ret.data;
        // console.log(data)
        var totalVideo = data.length;
        if (data.length === 0) {
          this.setState({
            running: false
          });
        }
        else {
          this.setState({
            videoProgress: ((1 / totalVideo) - 1) * 100,
            data: ret.data,
            running: true
          });
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  
  getStatus = status => {
    if (status === 0) {
      return "Resizing";
    } else if (status === 1) {
      return "Predicting";
    } else if (status === 2) {
      return "Generating"
    }
  }

  getProgress = (framenum, totalframe, status) => {
    var totalSteps = 3;
    var progress = (status * (100 / totalSteps)) + (framenum / totalframe) * (100 / totalSteps);
    // console.log(progress);
    return progress;
  }

  render() {
    const { classes } = this.props;

    if (this.state.running === false){
      return (<div> </div>);
    }

    return (
      <div className={this.props.className}>
        <h3 className={classes.trainStatus}> Predicting Status: </h3>
        {this.state.running ? (
          <div>
            <h4 className={classes.progressText}>
              Videos Completed: {this.state.videoProgress}%
            </h4>
            <LinearProgress
              className={classes.progressBar}
              variant="determinate"
              value={this.state.videoProgress}
            />
            {this.state.data.map(row => (
              <div key={row.videoid}>
                <h4 className={classes.progressText}>Videoid: {row.videoid}</h4>
                <Typography>
                    {this.getStatus(row.status)} at {row.framenum} {" "}
                    out of {row.totalframe} 
                </Typography>
                <LinearProgress
                  className={classes.progressBar}
                  variant="determinate"
                  value={this.getProgress(row.framenum, row.totalframe, row.status)}
                  // value={(row.framenum / row.totalframe) * 100}
                  color="secondary"
                />
              </div>
            ))}
          </div>
        ) : (
          <h4>Not Predicting</h4>
        )}
      </div>
    );
  }
}

export default withStyles(styles)(PredictProgress);

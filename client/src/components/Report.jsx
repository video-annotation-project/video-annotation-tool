import React from 'react';

// import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import VideosAnnotated from './VideosAnnotated.jsx';

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  }
});

class Report extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  componentDidMount = async () => {

  }

  /*
  function getVideoImage(path, secs, callback) {
    var me = this, video = document.createElement('video');
    video.setAttribute('crossOrigin', 'use-credentials');
    video.onloadedmetadata = function() {
      if ('function' === typeof secs) {
        secs = secs(this.duration);
      }
      this.currentTime = Math.min(Math.max(0, (secs < 0 ? this.duration : 0) + secs), this.duration);
    };
    video.onseeked = function(e) {
      var canvas = document.createElement('canvas');
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var img = new Image();
      img.setAttribute('crossOrigin', 'use-credentials');
      img.src = canvas.toDataURL();
      callback.call(me, img, this.currentTime, e);
    };
    video.onerror = function(e) {
      callback.call(me, undefined, undefined, e);
    };
    video.src = path;
  }

  {getVideoImage('https://d1yenv1ac8fa55.cloudfront.net/videos/DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4',
  100.5,
  function(img, secs, event) {
    if (event.type === 'seeked') {
      var li = document.createElement('li');
      li.innerHTML += '<b>Frame at second ' + secs + ':</b><br />';
      li.appendChild(img);
      document.getElementById('olFrames').appendChild(li);
    }
  }
  )}

<VideosAnnotated />
*/


  render() {
    const { classes } = this.props;
    return (
      <div id = 'olFrames' className={classes.root}>
        <VideosAnnotated />
      </div>
    );
  }
}

export default withStyles(styles)(Report);

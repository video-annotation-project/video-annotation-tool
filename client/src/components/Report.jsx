
import React from 'react';
import AWS from 'aws-sdk';
// import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import VideosAnnotated from './VideosAnnotated.jsx';
import axios from 'axios';

AWS.config.update(
  {
    accessKeyId: "AKIAIJRSQPH2BGGCEFOA",
    secretAccessKey: "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",
    region: 'us-west-1',
  }
);

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  },
});
/*
let encode = (data) => {
  var str = data.reduce(function(a,b){ return a+String.fromCharCode(b) },'');
  return btoa(str).replace(/.{76}(?=.)/g,'$&\n');
}
*/
class Report extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      img: null,
      loaded: false,
    };
  }
/*
  componentDidMount = async () => {
    let s3 = new AWS.S3();
    let key = 'test/1536275779167_box';
    var params = {
      Key: key,
      Bucket: 'lubomirstanchev',
    };
    s3.getObject(params, async (err, data) => {
      if (err) {
        console.log(err);
      } else {
        this.setState({
          img: 'data:image/png;base64, ' + encode(data.Body),
          loaded: true
        })
      }
    })
  }
  63 |       1 |     10 |         0 |    2.193173 |                1078 |               376 |             1138 |              460 |       1280 |         720 | 2018-09-01    | testing       | 1535830597562_box

  {this.getVideoImage('https://d1bnpmj61iqorj.cloudfront.net/videos/DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4',
  90)}
  */
  putVideoImage = (img, key, box) => {
    var s3 = new AWS.S3();
    let buf = new Buffer(img.src.replace(/^data:image\/\w+;base64,/, ""),'base64');
    let id = key;
    key = 'test/' + key;
    if (box) {
      key += '_box';
    }
    var params = {
      Key: key+'.png',
      Bucket: 'lubomirstanchev',
      ContentEncoding: 'base64',
      ContentType: 'image/png',
      Body: buf //the base64 string is now the body
    };
    try{
      s3.putObject(params).send();
      console.log('Img sent to aws');
      fetch('/updateImage', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
        body: JSON.stringify({
          'id': id,
          'box': box,
        })
      }).then(res => res.json())
        .then(res => {
          if (res.message === 'Updated') {
            console.log("Updated: " + res.value);
          } else {
            console.log("Error: " + res.message);
          }
        })
    } catch (error) {
      console.log('Error: ', error);
    }
  }

  drawImages = (myVideo, imageName, videoWidth, videoHeight, x1, y1, x2, y2) => {
    var canvas = document.createElement('canvas');
    canvas.height = videoHeight;
    canvas.width = videoWidth;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(myVideo, 0, 0, canvas.width, canvas.height);
    var img = new Image();
    img.setAttribute('crossOrigin', 'use-credentials');
    img.src = canvas.toDataURL();
    this.putVideoImage(img, imageName, false);
    ctx.lineWidth = "2";
    ctx.strokeStyle = "coral";
    ctx.rect(x1, y1, (x2-x1), (y2-y1));
    ctx.stroke();
    var imgWithBox = new Image();
    imgWithBox.setAttribute('crossOrigin', 'use-credentials');
    imgWithBox.src = canvas.toDataURL();
    this.putVideoImage(imgWithBox, imageName, true);
  }

  getVideoImage = (path, secs, imageName, videoWidth, videoHeight, x1, y1, x2, y2) => {
   var video = document.createElement('video');
   video.setAttribute('crossOrigin', 'use-credentials');
   video.onloadedmetadata = () => {
     video.currentTime = secs;
   };
   video.onseeked = (e) => {
     this.drawImages(video, imageName, videoWidth, videoHeight, x1, y1, x2, y2)
     /*
     var canvas = document.createElement('canvas');
     canvas.height = video.videoHeight;
     canvas.width = video.videoWidth;
     var ctx = canvas.getContext('2d');
     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
     var img = new Image();
     img.setAttribute('crossOrigin', 'use-credentials');
     img.src = canvas.toDataURL();
     this.putVideoImage(img, 'testingHanson1.png', false);
     */
   };
   video.onerror = (e) => {
     this.putVideoImage(undefined, undefined, false);
   };
   video.src = 'https://d1bnpmj61iqorj.cloudfront.net/videos/' + path;
 }

  loopThroughConcepts = (concepts) => {
    concepts.forEach(concept => {
      console.log(concept);
      this.getVideoImage(concept.filename, concept.timeinvideo, concept.id, concept.videowidth, concept.videoheight, concept.x1, concept.y1, concept.x2, concept.y2);
    })
    console.log('Done');
  }

  componentDidMount = async () => {
    axios.get('/api/missingAnnotations', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')},
    }).then(res => res.data)
      .then(res => {
        this.loopThroughConcepts(res);
      })
      .catch(error => {
        console.log("Error: " + error)
    })
  }

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>

      <ol id = 'olFrames' ></ol>

      </div>

    );
  }
}

export default withStyles(styles)(Report);

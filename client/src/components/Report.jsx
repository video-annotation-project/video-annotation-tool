import React from 'react';
import AWS from 'aws-sdk';

AWS.config.update(
  {
    accessKeyId: "AKIAI2JEDK66FXVNCR6A",
    secretAccessKey: "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",
    region: 'us-west-1',
  }
);

class Report extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      image: null,
      isLoaded: false,
    };
  }

  getVideoImage = (path, secs, callback) => {
    var video = document.createElement('video');
    video.setAttribute('crossOrigin', 'use-credentials');
    video.onloadedmetadata = function() {
      // this.currentTime = Math.min(Math.max(0, (secs < 0 ? this.duration : 0) + secs), this.duration);
      this.currentTime = secs;
    };
    video.onseeked = () => {
      var canvas = document.createElement('canvas');
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var img = new Image();
      img.setAttribute('crossOrigin', 'use-credentials');
      img.src = canvas.toDataURL();
      this.putVideoImage(img);
    };
    video.onerror = () => {
      console.log("error");
    };
    video.src = path;
  }

  putVideoImage = async (img) => {
    var s3 = new AWS.S3();
    var params = {
      Key: 'annotations/'+Date.now().toString(), //example
      Bucket: 'lubomirstanchev',
      ContentType: 'text/plain', //sending a base64 text string
      Body: img.src //the base64 string is now the body
    };
    try{
      s3.putObject(params).send();
      this.setState({
        isLoaded: true,
        image: img,
      });
    } catch (error) {
      console.log('Error: ', error);
    }
  }

  componentDidMount = () => {
    this.getVideoImage(
      'https://d1yenv1ac8fa55.cloudfront.net/videos/DocRicketts-0569_20131213T224337Z_00-00-01-00TC_h264.mp4',
      1);
  };

  render() {
    const { error, isLoaded, image } = this.state;
    if (!isLoaded) {
      return <div>Loading...</div>;
    }
    if (error)  {
      return <div>Error: {error.message}</div>;
    }
    return (
      <img id='imageId' src={image.src} alt='error' />
    );
  }
}

export default Report;

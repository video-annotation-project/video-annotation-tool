
import React from 'react';
import AWS from 'aws-sdk';
// import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import VideosAnnotated from './VideosAnnotated.jsx';
import TextDecoder from 'text-encoding'
AWS.config.update(
  {
    accessKeyId: "AKIAI2JEDK66FXVNCR6A",
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

let encode = (data) => {
  var str = data.reduce(function(a,b){ return a+String.fromCharCode(b) },'');
  return btoa(str).replace(/.{76}(?=.)/g,'$&\n');
}

class Report extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      img: null,
      loaded: false,
    };
  }

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

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        {this.state.loaded ? (
          <img src = {this.state.img} alt = "Don't Work" />
        ):(
          <div>Loading...</div>
        )}
      </div>
    );
  }
}

export default withStyles(styles)(Report);

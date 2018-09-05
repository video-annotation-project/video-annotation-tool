
import React from 'react';

// import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import VideosAnnotated from './VideosAnnotated.jsx';

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  },
});

class Report extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      image: null,
    };
  }

  toDataURL = (url, callback) => {
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    var reader = new FileReader();
    reader.onloadend = function() {
      callback(reader.result);
    }
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

  componentDidMount = async () => {
    await this.toDataURL('https://d1yenv1ac8fa55.cloudfront.net/test/1536186135339_box', async (res) => {
      await this.setState({
        image: res,
        loaded: true,
      });
      let img = document.getElementById('imageTag');
      img.src = res;
    })
  }

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        {this.state.loaded ? (<img id = 'imageTag' alt = 'Download Failed'/>):(<div>Loading</div>)}
      </div>
    );
  }
}

export default withStyles(styles)(Report);

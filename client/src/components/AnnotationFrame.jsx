import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import ListItem from '@material-ui/core/ListItem';

const styles = theme => ({
  item: {
    paddingTop: 0,
    width: '1300px',
    height: '730px',
    paddingLeft: 0
  },
  img: {
    width: '1280px',
    height: '720px',
  }
});

class AnnotationFrame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      image: null,
      isLoaded: false,
      error: null,
      width: null,
      height: null,
    };
  }
  encode = (data) => {
    var str = data.reduce(function(a,b) { return a+String.fromCharCode(b) },'');
    return btoa(str).replace(/.{76}(?=.)/g,'$&\n');
  }

  componentDidMount = async () => {
    fetch(`/api/annotationImage/${this.props.annotation.imagewithbox}`)
      .then(res => res.json())
      .then(res => {
        this.setState({
          image: 'data:image/png;base64, ' + this.encode(res.image.data),
          isLoaded: true
        });
      })
      .catch(error => {
        console.log("Error: " + error);
        this.setState({
          isLoaded: true
        });
      })
      .catch(error => {
        console.log(error);
        this.setState({
          isLoaded: true
        })
      });
  };

  render () {
    const { error, isLoaded, image } = this.state;
    const { classes } = this.props;
    if (!isLoaded) {
      return <div>Loading...</div>;
    }
    if (error)  {
      return <div>Error: {error.message}</div>;
    }
    return (
      <React.Fragment>
        <ListItem className={classes.item}>
          <div id='test'></div>
          <img className={classes.img} id='imageId' src={image} alt='error' />
        </ListItem>
      </React.Fragment>
    );
  }
}

AnnotationFrame.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(AnnotationFrame);

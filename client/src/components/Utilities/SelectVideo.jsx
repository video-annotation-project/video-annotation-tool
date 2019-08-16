import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Checkbox from '@material-ui/core/Checkbox';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import { Grid, Typography } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import Tooltip from '@material-ui/core/Tooltip';

const styles = theme => ({
  collection: {
    textTransform: 'none'
  },
  formControl: {
    marginTop: theme.spacing(1.5),
    maxHeight: '280px',
    overflow: 'auto'
  },
  group: {
    marginLeft: 15
  },
  button: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing()
  },
  list: {
    marginTop: theme.spacing(2),
    overflow: 'auto',
    maxHeight: `${280 + theme.spacing(4)}px`
  }
});

class SelectVideo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      videos: [],
      videoCollections: [],
      loaded: false
    };
  }

  componentDidMount = async () => {
    const { getVideos, getVideoCollections } = this.props;

    const videos = await getVideos();
    const videoCollections = await getVideoCollections();

    this.setState({
      videos,
      videoCollections,
      loaded: true
    });
  };

  loadVideoList = () => {
    const { value } = this.props;
    const { loaded, videos } = this.state;

    if (!loaded) return <Typography>Loading...</Typography>;

    if (videos.length === 0)
      return <Typography>No videos for current selection</Typography>;

    return videos.map(video => (
      <FormControlLabel
        key={video.id}
        value={video.id.toString()}
        control={<Checkbox color="secondary" />}
        label={`${video.id} ${video.filename}`}
        checked={value.includes(video.id.toString())}
      />
    ));
  };

  render() {
    const {
      classes,
      value,
      handleChange,
      handleSelectAll,
      handleUnselectAll,
      handleChangeList
    } = this.props;
    const { videos, videoCollections } = this.state;

    return (
      <Grid container spacing={5}>
        <Grid item>
          <Typography>Select videos</Typography>
          <div>
            <Button
              className={classes.button}
              color="primary"
              onClick={() => {
                handleSelectAll(videos, value, 'selectedVideos');
              }}
            >
              Select All
            </Button>
            <Button
              className={classes.button}
              color="primary"
              onClick={() => {
                handleUnselectAll('selectedVideos');
              }}
            >
              Unselect All
            </Button>
          </div>
          <FormControl className={classes.formControl}>
            <FormGroup
              className={classes.group}
              value={value}
              onChange={handleChangeList}
            >
              {this.loadVideoList()}
            </FormGroup>
          </FormControl>
        </Grid>
        <Grid item>
          <Typography>Select video collection</Typography>
          <List className={classes.list}>
            {videoCollections.map(videoCollection => (
              <ListItem key={videoCollection.id}>
                <Tooltip
                  title={
                    !videoCollection.description
                      ? ''
                      : videoCollection.description
                  }
                  placement="bottom-start"
                >
                  <div>
                    <Button
                      className={classes.collection}
                      variant="outlined"
                      value={videoCollection.id.toString()}
                      disabled={!videoCollection.videoids[0]}
                      onClick={() => {
                        if (videoCollection.videoids[0]) {
                          const videoids = [];
                          videos.forEach(video => {
                            if (videoCollection.videoids.includes(video.id)) {
                              videoids.push(video.id.toString());
                            }
                          });
                          handleChange(videoids);
                        }
                      }}
                    >
                      {videoCollection.name +
                        (!videoCollection.videoids[0] ? ' (No Videos)' : '')}
                    </Button>
                  </div>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles)(SelectVideo);

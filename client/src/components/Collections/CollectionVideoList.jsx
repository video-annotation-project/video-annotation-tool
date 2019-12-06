import React, { Component } from 'react';
import axios from 'axios';
import Button from '@material-ui/core/Button';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import Swal from 'sweetalert2/src/sweetalert2';

import GeneralMenu from '../Utilities/GeneralMenu';

const styles = theme => ({
  drawer: {
    width: '550px',
    overflow: 'auto'
  },
  toggleButton: {
    margin: theme.spacing(),
    float: 'right'
  },
  createButton: {
    marginTop: '10px',
    marginLeft: '20px'
  },
  addButton: {
    float: 'right',
    marginTop: '10px',
    marginLeft: '20px'
  },
  desc: {
    marginLeft: '20px'
  }
});

class CollectionVideoList extends Component {
  constructor(props) {
    super(props);
    const {
      createCollection,
      deleteCollection,
      insertToCollection,
      loadCollections
    } = this.props;

    this.state = {
      CollectionOpen: false,
      data: null
    };

    this.createCollection = createCollection;
    this.deleteCollection = deleteCollection;
    this.insertToCollection = insertToCollection;
    this.loadCollections = loadCollections;
  }

  componentDidMount = async () => {
    this.setState({
      data: await this.loadCollections()
    });
  };

  toggle = async (open, list) => {
    if (open === true) {
      this.setState({
        data: await this.loadCollections()
      });
    }
    this.setState({
      [list]: open
    });
  };

  handleNewCollectionModal = () => {
    this.toggle(false, 'CollectionOpen');
    this.createCollection();
  };

  handleDeleteCollectionModal = id => {
    this.toggle(false, 'CollectionOpen');
    this.deleteCollection(id);
  };

  handleInsert = id => {
    const { openedVideo } = this.props;
    this.toggle(false, 'CollectionOpen');
    this.insertToCollection(id, [openedVideo.id]);
  };

  handleListClick = async name => {
    const { data } = this.state;
    const collections = JSON.parse(JSON.stringify(data));
    const selected = collections.find(col => col.name === name);
    selected.expanded = !selected.expanded;
    this.setState({
      data: collections
    });
  };

  handleChange = (collectionid, name, videoid) => event => {
    const { data } = this.state;
    const checkedVideos = data;
    const selectedCol = checkedVideos.find(video => video.id === collectionid);
    if (!selectedCol.checked) {
      selectedCol.checked = [];
    }
    const index = selectedCol.checked.indexOf(videoid);
    if (event.target.checked && !selectedCol.checked.includes(videoid)) {
      selectedCol.checked.push(videoid);
    } else if (!event.target.checked) {
      selectedCol.checked.splice(index, 1);
    }
    this.setState({
      [name]: event.target.checked
    });
  };

  removeVideo = async id => {
    const { data } = this.state;
    const videoList = data.find(col => col.id === id).checked;
    console.log(`${id} ${videoList}`);
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      data: {
        videos: videoList
      }
    };
    this.toggle(false, 'CollectionOpen');
    Swal.fire({
      title: 'Are you sure?',
      text: `Removing ${videoList} from Collection ${id}`,
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async result => {
      if (result.value) {
        try {
          await axios.delete(`/api/collections/videos/elements/${id}`, config);
          Swal.fire('Deleted!', 'Videos have been removed.', 'success');
          this.setState({
            data: await this.loadCollections()
          });
        } catch (error) {
          console.log(error);

          Swal.fire('Error removing', '', 'error');
        }
      }
    });
  };

  ternaryOpLoop = (firstif, secondif) => {
    if (firstif) {
      if (secondif) {
        return <ExpandLess />;
      }
      return <ExpandMore />;
    }
    return '';
  };

  render() {
    const { classes, collType } = this.props;
    const { data, CollectionOpen } = this.state;
    if (!data) {
      return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
    }

    return (
      <div className={classes.root}>
        <Button
          className={classes.toggleButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggle(true, 'CollectionOpen')}
        >
          {collType} Collections
        </Button>

        <Drawer
          anchor="right"
          open={CollectionOpen}
          onClose={() => this.toggle(false, 'CollectionOpen')}
        >
          <div className={classes.drawer}>
            <div className={classes.addButton}>
              <GeneralMenu
                name="Add opened video to collection"
                variant="contained"
                color="primary"
                handleInsert={this.handleInsert}
                Link={false}
                items={data}
              />
            </div>
            <Button
              className={classes.createButton}
              variant="contained"
              color="primary"
              onClick={() => this.handleNewCollectionModal()}
            >
              Create New Collection
            </Button>
            <List component="div" disablePadding>
              {data.map(collection => (
                <React.Fragment key={collection.id}>
                  <ListItem
                    button
                    onClick={() => this.handleListClick(collection.name)}
                  >
                    <ListItemText
                      primary={`${collection.id}. ${collection.name}`}
                      secondary={collection.videoids.join(' , ')}
                    />
                    <IconButton
                      onClick={() =>
                        this.handleDeleteCollectionModal(collection.id)
                      }
                      aria-label="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                    {this.ternaryOpLoop(
                      collection.videoids[0] || collection.description,
                      collection.expanded
                    )}
                  </ListItem>

                  {collection.videoids[0] || collection.description ? (
                    <Collapse
                      in={collection.expanded}
                      timeout="auto"
                      unmountOnExit
                    >
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        className={classes.desc}
                      >
                        {collection.description}
                      </Typography>
                      {collection.videoids[0] ? (
                        <div>
                          <List disablePadding>
                            {collection.videos.map(video => (
                              <ListItem key={video.id}>
                                <Checkbox
                                  checked={video.selected}
                                  onChange={this.handleChange(
                                    collection.id,
                                    video.selected,
                                    video.id
                                  )}
                                  value="selected"
                                  color="primary"
                                  inputProps={{
                                    'aria-label': 'secondary checkbox'
                                  }}
                                />
                                <ListItemText
                                  primary={`${video.id} ${video.filename}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                          <Button
                            className={classes.createButton}
                            variant="contained"
                            color="primary"
                            onClick={() => this.removeVideo(collection.id)}
                          >
                            Remove Videos
                          </Button>
                        </div>
                      ) : (
                        ''
                      )}
                    </Collapse>
                  ) : (
                    ''
                  )}
                </React.Fragment>
              ))}
            </List>
          </div>
        </Drawer>
      </div>
    );
  }
}

export default withStyles(styles)(CollectionVideoList);

import React, { Component } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import Button from "@material-ui/core/Button";
import Drawer from "@material-ui/core/Drawer";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { withStyles } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";

import GeneralMenu from "../Utilities/GeneralMenu";

import Collapse from "@material-ui/core/Collapse";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

import Checkbox from '@material-ui/core/Checkbox';

import Typography from '@material-ui/core/Typography';

import Swal from "sweetalert2";

const styles = theme => ({
  drawer: {
    width: "550px",
    overflow: "auto"
  },
  toggleButton: {
    marginTop: "5px",
    float: "right"
  },
  createButton: {
    marginTop: "10px",
    marginLeft: "20px"
  },  
  addButton: {
    float: "right",
    marginTop: "10px",
    marginLeft: "20px"
  },
  desc: {
    marginLeft: "20px"
  },
});

class CollectionVideoList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      CollectionOpen: false,
      data: null
    };
  }

  componentDidMount = () => {
    this.setState({
      data: this.props.data
    })
  }

  componentDidUpdate(prevProps, prevState) {
    // only update chart if the data has changed
    if (prevProps.data !== this.props.data) {
      this.setState({
        data: this.props.data
      })
    }
  }

  toggle = list => {
    this.props.loadCollections();
    this.setState({
      [list]: !this.state[list]
    });
  };

  handleNewCollectionModal = () => {
    this.toggle("CollectionOpen");
    this.props.createCollection();
  } 

  handleDeleteCollectionModal = id => {
    this.toggle("CollectionOpen");
    this.props.deleteCollection(id)
  } 

  handleInsert = id => {
    this.toggle("CollectionOpen");
    this.props.insertToCollection(id, [this.props.openedVideo.id])
  }

  handleListClick = async name => {
    let data = JSON.parse(JSON.stringify(this.state.data));
    let selected = data.find(data => data.name === name);
    selected.expanded = !selected.expanded;
    this.setState({
      data: data
    });
  };

  handleChange = (collectionid, name, videoid) => event => {
    var checkedVideos = this.state.data;
    var selectedCol = checkedVideos.find(data => data.id === collectionid)
    if (!selectedCol.checked) {
      selectedCol.checked = [];
    }
    var index = selectedCol.checked.indexOf(videoid);
    if (event.target.checked &&
      !selectedCol.checked.includes(videoid)
      ) {
        selectedCol.checked.push(videoid);
    }
    else if (!event.target.checked) {
      selectedCol.checked.splice(index, 1);
    }
    this.setState({
      ...this.state, 
      [name]: event.target.checked
    });
  }

  removeVideo = async id => {
    var videoList = this.state.data.find(data => data.id === id).checked;
    console.log(id + " " +  this.state.data.find(data => data.id === id).checked);
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      data: {
        videos: videoList
      }
    };
    this.toggle("CollectionOpen");
    Swal.fire({
      title: "Are you sure?",
      text: `Removing ${videoList} from Collection ${id}`,
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async result => {
      if (result.value) {
        try {
          await axios.delete("/api/collections/videos/" + id, config);
          Swal.fire("Deleted!", "Videos have been removed.", "success");
          this.props.loadCollections()
        } catch (error) {
          Swal.fire("Error removing", "", "error");
        }
      }
    });
  }

  render() {
    const { classes } = this.props;
    const { data } = this.state;
    if (!data) {
      return <div>Loading...</div>
    } 

    return (
      <div className={classes.root}>
        <Button
          className={classes.toggleButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggle("CollectionOpen")}
        >
          Toggle {this.props.collType} Collection List
        </Button>

        <Drawer
          anchor="right"
          open={this.state.CollectionOpen}
          onClose={() => this.toggle("CollectionOpen")}
        >
          <div className={classes.drawer}>
            <div className={classes.addButton}>
              <GeneralMenu
                name={"Add opened video to collection"}
                variant="contained"
                color="primary"
                handleInsert={this.handleInsert}
                Link={false}
                items={
                  this.props.data
                }
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
                  <ListItem button onClick={() => this.handleListClick(collection.name)}>
                    <ListItemText primary={collection.id + ". " + collection.name} 
                      secondary={collection.videoids.join(" , ")}
                    />
                    <IconButton 
                      onClick={() => this.handleDeleteCollectionModal(collection.id)} 
                      aria-label="Delete"
                    >
                      <DeleteIcon/>
                    </IconButton>
                    {collection.videoids[0] || collection.description ? 
                    collection.expanded ? <ExpandLess /> : <ExpandMore /> : ""
                    }

                  </ListItem>
                  
                  {collection.videoids[0] || collection.description ? 
                  <Collapse in={collection.expanded} timeout="auto" unmountOnExit>
                    <Typography variant="subtitle1" gutterBottom className={classes.desc}>
                      {collection.description} 
                    </Typography>
                    {collection.videoids[0] ?
                    <div>
                      <List disablePadding>
                        {collection.videos.map(video => (
                          <ListItem key={video.f1}>
                            <Checkbox
                              checked={video.selected}
                              onChange={this.handleChange(collection.id, video.selected, video.f1)}
                              value="selected"
                              color="primary"
                              inputProps={{
                                'aria-label': 'secondary checkbox',
                              }}
                            /> 
                            <ListItemText primary={video.f1 + " " + video.f2}/>
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
                    </div> : ""}
                  </Collapse> : ""}
                  
                </React.Fragment>
              ))}
            </List>
          </div>
        </Drawer>
      </div>
    );
  }
}

CollectionVideoList.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(CollectionVideoList);

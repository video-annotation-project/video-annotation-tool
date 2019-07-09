import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Swal from "sweetalert2";

import ConceptsSelected from "../Utilities/ConceptsSelected";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";

const styles = theme => ({
  button: {
    marginTop: theme.spacing.unit * 2,
    marginLeft: theme.spacing.unit
  },
  formControl: {
    marginBottom: theme.spacing.unit * 2,
    marginTop: theme.spacing.unit * 3,
    marginLeft: theme.spacing.unit * 3,
    minWidth: 200
  }
});

class ConceptCollection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      collections: [],
      selectedCollection: "",
      concepts: []
    };
  }

  componentDidMount() {
    return this.loadCollections();
  }

  loadCollections = callback => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    return axios.get("/api/conceptCollections", config).then(res => {
      console.log(res.data);
      this.setState(
        {
          collections: res.data
        },
        callback
      );
    });
  };

  createCollection = () => {
    Swal.mixin({
      confirmButtonText: "Next",
      showCancelButton: true,
      progressSteps: ["1", "2"]
    })
      .queue([
        {
          title: "Collection Name",
          input: "text"
        },
        {
          title: "Description",
          input: "textarea"
        }
      ])
      .then(async result => {
        if (result.value) {
          const body = {
            name: result.value[0],
            description: result.value[1]
          };
          const config = {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + localStorage.getItem("token")
            }
          };
          try {
            await axios.post("/api/conceptCollection", body, config);
            Swal.fire({
              title: "Collection Created!",
              confirmButtonText: "Lovely!"
            });
          } catch (error) {
            Swal.fire("", error, error);
          }
        }
      });
  };

  deleteCollection = async id => {
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      id: id
    };
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async result => {
      if (result.value) {
        try {
          let response = await axios.patch(
            "/api/conceptCollection/",
            body,
            config
          );
          if (response.status) {
            Swal.fire("Deleted!", "Collection has been deleted.", "success");
            this.loadCollections();
          }
        } catch (error) {
          Swal.fire("ERROR deleting", result.value, "error");
        }
      }
    });
  };

  saveToCollection = (id, list) => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      concepts: list
    };
    try {
      axios
        .post("/api/conceptCollection/" + id, body, config)
        .then(res => {
          Swal.fire({
            title: "Inserted!",
            confirmButtonText: "Lovely!"
          });
        })
        .catch(error => {
          Swal.fire("Could not insert", "", "error");
        });
    } catch (error) {
      Swal.fire("", error, error);
    }
  };

  handleConceptClick = concept => {
    let concepts = Array.from(new Set(this.state.concepts.concat(concept)));
    this.setState({
      concepts: concepts
    });
  };

  handleRemove = concept => {
    let concepts = this.state.concepts.filter(selected => {
      return selected !== concept;
    });
    this.setState({
      concepts: concepts
    });
  };

  handleRemoveAll = () => {
    this.setState({
      concepts: []
    });
  };

  handleChangeCollection = event => {
    this.setState({
      selectedCollection: event.target.value
    });
    console.log(this.state.selectedCollection);
  };

  render() {
    const { classes } = this.props;
    return (
      <React.Fragment>
        <ConceptsSelected handleConceptClick={this.handleConceptClick} />
        <FormControl className={classes.formControl}>
          <InputLabel>Select collection</InputLabel>
          <Select
            value={this.state.selectedCollection}
            onChange={this.handleChangeCollection}
            autoWidth={true}
          >
            <MenuItem value="">Select collection</MenuItem>
            {this.state.collections.map(collection => {
              return (
                <MenuItem
                  key={collection.collectionid}
                  value={collection.collectionid}
                >
                  {collection.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <div>
          <Button
            className={classes.button}
            onClick={() => this.createCollection()}
          >
            New Concept Collection
          </Button>
          <Button
            className={classes.button}
            onClick={() => this.deleteCollection(4)}
          >
            Delete Concept Collection
          </Button>
        </div>
        <List className={classes.list}>
          {this.state.concepts.length > 0
            ? this.state.concepts.map(concept => {
                return (
                  <ListItem key={concept.id}>
                    <Avatar src={`/api/conceptImages/${concept.id}`} />
                    <ListItemText
                      inset
                      primary={concept.name}
                      secondary={concept.id}
                    />
                    <IconButton onClick={() => this.handleRemove(concept)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                );
              })
            : ""}
        </List>
        <Button
          className={classes.button}
          onClick={() => {
            this.handleRemoveAll();
          }}
        >
          Remove All
        </Button>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={() => this.saveToCollection(6, [10, 20, 30])}
        >
          Save
        </Button>
      </React.Fragment>
    );
  }
}

ConceptCollection.protoTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(ConceptCollection);

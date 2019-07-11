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
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";

import ConceptsSelected from "../Utilities/ConceptsSelected";

const styles = theme => ({
  button: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    marginLeft: theme.spacing(2)
  },
  deleteButton: {
    marginRight: "450px"
  },
  description: {
    marginLeft: theme.spacing(2)
  },
  formControl: {
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(3),
    marginLeft: theme.spacing(3),
    minWidth: 200
  },
  list: {
    marginLeft: theme.spacing(1)
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
    return axios.get("/api/collections/concepts", config).then(res => {
      this.setState(
        {
          collections: res.data.filter(collection => {
            return !collection.deleted_flag;
          })
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
            this.loadCollections();
          } catch (error) {
            Swal.fire("Error creating collection", "", "error");
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
            this.setState({
              selectedCollection: "",
              concepts: []
            });
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
            title: "Saved!",
            confirmButtonText: "Lovely!"
          });
          this.loadCollections();
        })
        .catch(error => {
          Swal.fire("Could not insert", "", "error");
        });
    } catch (error) {
      Swal.fire("", error, error);
    }
  };

  handleConceptClick = concept => {
    if (
      this.state.concepts.filter(selectedConcept => {
        return selectedConcept.id === concept.id;
      }).length === 0
    ) {
      this.setState({
        concepts: this.state.concepts.concat(
          (({ id, name, picture }) => ({ id, name, picture }))(concept)
        )
      });
    }
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

  handleUndo = () => {
    let concepts = this.state.collections.filter(collection => {
      return collection.collectionid === this.state.selectedCollection;
    })[0].concepts;

    this.setState({
      concepts: !concepts[0].id ? [] : concepts
    });
  };

  handleChangeCollection = event => {
    let currentCollection = this.state.collections.filter(collection => {
      return collection.collectionid === event.target.value;
    })[0];

    this.setState({
      selectedCollection: event.target.value,
      concepts:
        !currentCollection || !currentCollection.concepts[0].id
          ? []
          : currentCollection.concepts
    });
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
          {this.state.selectedCollection === "" ||
          !this.state.collections.filter(collection => {
            return collection.collectionid === this.state.selectedCollection;
          })[0].description ? (
            ""
          ) : (
            <FormHelperText>
              {
                this.state.collections.filter(collection => {
                  return (
                    collection.collectionid === this.state.selectedCollection
                  );
                })[0].description
              }
            </FormHelperText>
          )}
        </FormControl>
        <div>
          <Button
            className={classes.button}
            onClick={() => this.deleteCollection(this.state.selectedCollection)}
            disabled={this.state.selectedCollection === ""}
          >
            Delete This Collection
          </Button>
          <Button className={classes.button} onClick={this.createCollection}>
            New Concept Collection
          </Button>
        </div>
        <List className={classes.list}>
          {this.state.concepts.length > 0
            ? this.state.concepts.map(concept => {
                return (
                  <ListItem key={concept.id}>
                    <Avatar src={`/api/concepts/images/${concept.id}`} />
                    <ListItemText inset primary={concept.name} />
                    <IconButton
                      className={classes.deleteButton}
                      onClick={() => this.handleRemove(concept)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                );
              })
            : ""}
        </List>
        <Button
          className={classes.button}
          onClick={this.handleUndo}
          disabled={
            this.state.selectedCollection === "" ||
            this.state.collections.filter(collection => {
              return collection.collectionid === this.state.selectedCollection;
            })[0].concepts === this.state.concepts ||
            (!this.state.collections.filter(collection => {
              return collection.collectionid === this.state.selectedCollection;
            })[0].concepts[0].id &&
              this.state.concepts.length === 0)
          }
        >
          Undo Changes
        </Button>
        <Button
          className={classes.button}
          onClick={this.handleRemoveAll}
          disabled={this.state.concepts.length === 0}
        >
          Remove All
        </Button>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={() => {
            let conceptids = [];
            this.state.concepts.forEach(concept => {
              conceptids.push(concept.id);
            });
            this.saveToCollection(this.state.selectedCollection, conceptids);
          }}
          disabled={
            this.state.selectedCollection === "" ||
            this.state.collections.filter(collection => {
              return collection.collectionid === this.state.selectedCollection;
            })[0].concepts === this.state.concepts ||
            (!this.state.collections.filter(collection => {
              return collection.collectionid === this.state.selectedCollection;
            })[0].concepts[0].id &&
              this.state.concepts.length === 0)
          }
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

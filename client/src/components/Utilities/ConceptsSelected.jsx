import React from "react";
import axios from "axios";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import { withStyles } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import { ChevronRight, Close } from "@material-ui/icons";

import SearchModal from "./SearchModal.jsx";

const styles = theme => ({
  root: {
  },
  extendDrawerButton: {
    float: "right",
    marginTop: "5px"
  },
  drawerContent: {
    position: "relative",
    textAlign: "center"
  },
  retractDrawerButton: {
    position: "absolute",
    left: 0,
    margin: "10px"
  },
  addConceptButton: {
    margin: "15px 0px 15px 0px"
  },
  conceptsList: {
    fontSize: "130%",
    display: "flex",
    flexFlow: "row wrap"
  },
  concept: {
    width: "50%",
    cursor: "pointer"
  },
  deleteConceptButton: {
    float: "right",
    height: "25px",
    width: "25px"
  },
  deleteConceptIcon: {
    fontSize: "15px"
  }
});

class ConceptsSelected extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      drawerOpen: false,
      conceptsSelected: [],
      draggedConcept: null,
      searchModalOpen: false
    };
  }

  updateSearch = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .get(`/api/concepts`, config)
      .then(res => {
        this.setState({
          concepts: res.data
        });
      })
      .catch(error => {
        console.log("Error in get /api/concepts");
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  }

  getConceptsSelected = () => {
    axios
      .get("/api/users/concepts", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      })
      .then(res => {
        this.setState({
          isLoaded: true,
          conceptsSelected: res.data
        });
      })
      .catch(error => {
        this.setState({
          isLoaded: true,
          error: error
        });
      });
  };

  componentDidMount = () => {
    this.getConceptsSelected();
  };

  toggleDrawer = () => {
    this.setState({
      drawerOpen: !this.state.drawerOpen
    });
  };

  toggleSearchModal = boolean => {
    this.updateSearch();
    this.setState({
      searchModalOpen: boolean
    });
  };

  // adds a concept to conceptsSelected
  selectConcept = conceptId => {
    const body = {
      id: conceptId
    };
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .post("/api/users/concepts", body, config)
      .then(async res => {
        this.toggleSearchModal(false);
        this.getConceptsSelected();
      })
      .catch(error => {
        this.toggleSearchModal(false);
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  deleteConcept = (event, index) => {
    event.stopPropagation();
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      data: {
        id: this.state.conceptsSelected[index].id
      }
    };
    axios
      .delete("/api/users/concepts", config)
      .then(async res => {
        this.getConceptsSelected();
      })
      .catch(error => {
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  onDragStart = (event, index) => {
    this.setState({
      draggedConcept: this.state.conceptsSelected[index]
    });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/html", event.currentTarget);
    event.dataTransfer.setDragImage(event.currentTarget, 20, 20);
  };

  onDragOver = index => {
    // if the concept is dragged over itself, ignore
    if (this.state.draggedConcept === this.state.conceptsSelected[index]) {
      return;
    }
    // filter out the dragged concept
    let conceptsSelected = this.state.conceptsSelected.filter(
      concept => concept !== this.state.draggedConcept
    );
    // insert the dragged concept after the dragged over concept
    conceptsSelected.splice(index, 0, this.state.draggedConcept);
    this.setState({
      conceptsSelected: conceptsSelected
    });
  };

  onDragEnd = () => {
    this.setState({
      draggedConcept: null
    });
    let conceptsSelected = this.state.conceptsSelected;
    conceptsSelected.forEach((concept, idx) => {
      concept.conceptidx = idx;
    });
    const body = {
      conceptsSelected: conceptsSelected
    };
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .patch("/api/users/concepts", body, config)
      .then(async res => {})
      .catch(error => {
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };

  onMouseEnter = event => {
    if (this.state.draggedConcept) {
      return;
    }
    event.currentTarget.style.backgroundColor = "lightgrey";
  };

  onMouseLeave = event => {
    if (this.state.draggedConcept) {
      return;
    }
    event.currentTarget.style.backgroundColor = "white";
  };

  render() {
    const { classes } = this.props;

    let drawerContent = <div />;
    if (!this.state.isLoaded) {
      drawerContent = <div>Loading...</div>;
    } else {
      drawerContent = (
        <div className={classes.drawerContent}>
          <IconButton
            className={classes.retractDrawerButton}
            onClick={() => this.toggleDrawer()}
          >
            <ChevronRight />
          </IconButton>
          <Button
            className={classes.addConceptButton}
            variant="contained"
            color="primary"
            aria-label="Add"
            onClick={() => this.toggleSearchModal(true)}
          >
            <AddIcon />
          </Button>
          <div className={classes.conceptsList}>
            {this.state.conceptsSelected.map((concept, index) => (
              <div
                key={concept.id}
                className={classes.concept}
                onClick={() => this.props.handleConceptClick(concept)}
                draggable
                onDragStart={event => this.onDragStart(event, index)}
                onDragOver={() => this.onDragOver(index)}
                onDragEnd={this.onDragEnd}
                onMouseEnter={event => this.onMouseEnter(event)}
                onMouseLeave={event => this.onMouseLeave(event)}
              >
                <IconButton
                  className={classes.deleteConceptButton}
                  onClick={event => this.deleteConcept(event, index)}
                >
                  <Close className={classes.deleteConceptIcon} />
                </IconButton>
                {concept.name}
                <br />
                <img
                  src={"/api/concepts/images/" + concept.id}
                  alt="Could not be downloaded"
                  height="50"
                  width="50"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={classes.root}>
        <Button
          className={classes.extendDrawerButton}
          variant="contained"
          color="primary"
          onClick={() => this.toggleDrawer()}
        >
          Toggle Concepts Selected
        </Button>
        <div
          style={{
            height: "100%",
            width: this.state.drawerOpen ? "440px" : "0px",
            position: "fixed",
            zIndex: 1,
            top: 0,
            right: 0,
            backgroundColor: "white",
            overflowX: "hidden",
            transition: "0.3s"
          }}
        >
          {drawerContent}
        </div>
        <SearchModal
          inputHandler={this.selectConcept}
          open={this.state.searchModalOpen}
          handleClose={() => this.toggleSearchModal(false)}
          concepts={this.state.concepts}
        />
      </div>
    );
  }
}

// persistent Drawer component from material.ui is buggy, so I implemented
// my own
// <Drawer
//   variant="persistent"
//   anchor="right"
//   open={this.state.drawerOpen}
//   onClose={() => this.toggleDrawer(false)}
// >
//   {drawerContent}
// </Drawer>

export default withStyles(styles)(ConceptsSelected);

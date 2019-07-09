import React, { Component } from "react";
import axios from "axios";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => ({
  dialogTitle: {
    padding: 10,
    textAlign: "center"
  },

});

/*
  A pop up dialog box that prompts the user for input.
  Has the properties:
    -inputHandler: function called when user hits enter, passes the input
    -title
    -message
    -handleClose
    -open
*/
class SearchModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      concepts: null,
      conceptsLikeSearch: []
    };
  }

  componentDidMount = () => {
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
  };

  getId = concept => {
    const match = this.state.concepts.find(item => {
      return item.name === concept;
    });
    return match ? match.id : null;
  };

  handleClose = () => {
    this.props.handleClose();
  };

  handleKeyUp = e => {
    if (e.key === "Enter") {
      if (this.getId(e.target.value)) {
        this.props.inputHandler(this.getId(e.target.value));
      } else {
        this.handleClose();
      }
      return;
    }
    this.searchConcepts(e.target.value);
  };

  searchConcepts = search => {
    const conceptsLikeSearch = this.state.concepts.filter(concept => {
      return concept.name.match(new RegExp(search, "i"));
    });

    this.setState({
      conceptsLikeSearch: conceptsLikeSearch.slice(0, 10)
    });
  };

  render() {
    let { concepts, conceptsLikeSearch } = this.state;
    const { classes } = this.props;
    if (!concepts) {
      return (
        <Dialog open={this.props.open} onClose={this.handleClose}>
          <div>Loading...</div>
        </Dialog>
      );
    }
    return (
      <div>
        <Dialog
          open={this.props.open}
          onClose={this.handleClose}
        >
          <DialogTitle
            className={classes.dialogTitle}
          >
            Add New Concept
          </DialogTitle>
          <DialogContent>
            <input
              onKeyUp={this.handleKeyUp}
              autoFocus
              margin="dense"
              id="concept"
              type="text"
              placeholder="Search Concepts"
              list="data"
              autoComplete="off"
            />
            <datalist id="data">
              {conceptsLikeSearch.map(item => (
                <option key={item.id} value={item.name} />
              ))}
            </datalist>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
}

export default withStyles(styles)(SearchModal);

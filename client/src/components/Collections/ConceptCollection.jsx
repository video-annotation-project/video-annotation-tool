import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import ConceptsSelected from "../Utilities/ConceptsSelected";
import Button from "@material-ui/core/Button";
import Swal from "sweetalert2";
const styles = theme => ({

});

class ConceptCollection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      collections: []
    };
  }

  componentDidMount = () => {

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
      confirmButtonText: 'Next',
      showCancelButton: true,
      progressSteps: ['1', '2']
    }).queue([
      { 
        title: 'Collection Name',
        input: 'text'
      },
      {
        title: 'Description',
        input: 'textarea'
      }
    ]).then(async (result) => {
      if (result.value) {
        const body = {
          name: result.value[0],
          description: result.value[1]
        }
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token")
          }
        };
        try {
          await axios.post("/api/conceptCollection", body, config)
          Swal.fire({
            title: 'Collection Created!',
            confirmButtonText: 'Lovely!'
          })
        } catch (error) {
          Swal.fire("", error, error);
        }
      }
    })
  }

  deleteCollection = async id => {
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      id: id
    }
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
          let response = await axios.patch("/api/conceptCollection/", body, config);
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

  insertToCollection = (id, list) => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      concepts: list
    }
    try {
      axios.post("/api/conceptCollection/" + id, body, config)
        .then(res => {
          Swal.fire({
            title: 'Inserted!',
            confirmButtonText: 'Lovely!'
          })
        })
        .catch(error => {
          Swal.fire("Could not insert", "","error");
        });
    } catch (error) {
      Swal.fire("", error, error);
    }
  }

  handleConceptClick = concept => {
    console.log(concept)
  }
  
  render() {
    return (
    <div>
      <Button
        onClick={()=>this.loadCollections()}
      >
        Load Concept Collection
      </Button>
      <Button
        onClick={()=>this.createCollection()}
      >
        Create Concept Collection
      </Button>
      <Button
        onClick={()=>this.deleteCollection(4)}
      >
        Delete Concept Collection
      </Button>
      <Button
        onClick={()=>this.insertToCollection(4, [10,20,30])}
      >
        Insert Into Collection
      </Button>


    </div>
    )
        // 
    // )
  }
}

ConceptCollection.protoTypes = {
  classes: PropTypes.object.isRequired
}

export default withStyles(styles)(ConceptCollection);
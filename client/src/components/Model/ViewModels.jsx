import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Table from "@material-ui/core/Table";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import Swal from "sweetalert2";

const CustomTableCell = withStyles(theme => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontSize: 14
  },
  body: {
    fontSize: 14
  },
}))(TableCell);

const styles = theme => ({
  root: {
    margins: 'auto',
    padding: '20px 12%',
  },
  row: {
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.background.default
    }
  },
});

class ViewModels extends Component {
  constructor(props) {
    super(props);
    this.state = {
      models: [],
      modelSelected: ""
    };
  }

  componentDidMount = () => {
    this.loadExistingModels();
  };

  loadExistingModels = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    axios
      .get(`/api/models`, config)
      .then(res => {
        this.setState({
          models: res.data
        });
      })
      .catch(error => {
        console.log("Error in get /api/models");
        console.log(error);
        if (error.response) {
          console.log(error.response.data.detail);
        }
      });
  };


  deleteModel = async (model) => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      data: {
        model: model
      }
    };
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.value) {
        try {
          await axios.delete("/api/models", config);
          Swal.fire(
            'Deleted!',
            'Video has been deleted.',
            'success'
          )
          this.loadExistingModels();
        } catch (error) {
          Swal.fire(error, "", "error");
        }
      }
    })
  }

  render() {
    const { classes } = this.props;
    const { models } = this.state;
    if (!models) {
      return <div>Loading...</div>;
    }
    return (
      <div className={classes.root}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <CustomTableCell>Name</CustomTableCell>
              <CustomTableCell align="right">Date Created</CustomTableCell>
              <CustomTableCell>Concepts</CustomTableCell>
              <CustomTableCell>Verification Videos</CustomTableCell>
              <CustomTableCell>Delete</CustomTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {models.map(model => (
              <TableRow key={model.name}>
                <CustomTableCell component="th" scope="row">
                  {model.name}
                </CustomTableCell>
                <CustomTableCell align="right">
                  {model.timestamp}
                </CustomTableCell>
                <CustomTableCell align="right">
                  {model.concepts.toString()}
                </CustomTableCell>
                <CustomTableCell>{model.videos ? model.videos.toString() : "NON"}</CustomTableCell>
                <CustomTableCell>
                  <IconButton 
                    onClick={() => this.deleteModel(model)} 
                    aria-label="Delete"
                  >
                    <DeleteIcon/>
                  </IconButton>
                </CustomTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}

ViewModels.propTypes = {
  classes: PropTypes.object
};

export default withStyles(styles)(ViewModels);

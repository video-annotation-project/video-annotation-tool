import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Table from "@material-ui/core/Table";

const CustomTableCell = withStyles(theme => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontSize: 14
  },
  body: {
    fontSize: 14
  }
}))(TableCell);

const styles = theme => ({
  root: {
    //width: '100%',
    marginTop: theme.spacing.unit * 3
    //overflowX: 'auto',
  },
  table: {
    width: 200
  },
  row: {
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.background.default
    }
  }
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
              <CustomTableCell>Etc...</CustomTableCell>
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
                <CustomTableCell>Foo Bar</CustomTableCell>
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

import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Modal from "@material-ui/core/Modal";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import Paper from "@material-ui/core/Paper";
import geoLib from "geolib";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";

const styles = theme => ({
  paper: {
    position: "absolute",
    width: theme.spacing(100),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(4),
    outline: "none",
    transform: "translate(-50%, -50%)",
    top: "50%",
    left: "50%"
  },
  root: {
    width: "100%",
    marginTop: theme.spacing(3),
    overflowX: "auto"
  },
  table: {
    minWidth: 700
  }
});

class Summary extends React.Component {
  state = {
    open: false,
    showTotal: false,
    total: null,
    anno: null,
    km: false
  };

  getTotal = data => {
    var count = 0;
    var anno = 0;
    data.forEach(element => {
      if (element.rank === "species") {
        count++;
      }
      anno = anno + parseInt(element.count);
    });
    this.setState({ showTotal: true, total: count, anno: anno });
  };

  convertDistance = () => {
    if (this.state.km) this.setState({ km: false });
    else this.setState({ km: true });
  };

  setDecimal = data => {
    return parseFloat(data).toFixed(5);
  };

  render() {
    const { classes } = this.props;
    var start, end, dist, depth;

    if (this.props.gpsstart && this.props.gpsstop) {
      start = {
        latitude: this.props.gpsstart.x,
        longitude: this.props.gpsstart.y
      };
      end = { latitude: this.props.gpsstop.x, longitude: this.props.gpsstop.y };
      dist = geoLib.getDistance(start, end, 1, 3);
    } else {
      dist = 1;
    }
    if (this.props.startdepth && this.props.enddepth) {
      depth = this.props.startdepth - this.props.enddepth;
    } else {
      depth = 0;
    }

    return (
      <div>
        <Modal
          aria-labelledby="simple-modal-title"
          aria-describedby="simple-modal-description"
          open={this.props.open}
          onClose={this.props.handleClose}
        >
          <div className={classes.paper}>
            {this.props.metrics ? 
              <div>
              <Typography variant="h5" color="primary">Prediction Metrics</Typography>
              <Paper style={{ maxHeight: 400, overflow: "auto" }}>
              <Table className={classes.table}> 
              <TableHead>
                <TableRow>
                  <TableCell>ConceptId</TableCell>
                  <TableCell>TP</TableCell>
                  <TableCell>FP</TableCell>
                  <TableCell>FN</TableCell>
                  <TableCell>Precision</TableCell>
                  <TableCell>Recall</TableCell>
                  <TableCell>F1</TableCell>
                  <TableCell>pred_num</TableCell>
                  <TableCell>true_num</TableCell>
                  <TableCell>count_accuracy</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {this.props.metrics ? (
                  this.props.metrics.map(row => (
                    <TableRow key={row.conceptid}>
                      <TableCell>{row.conceptid}</TableCell>
                      <TableCell>{row.TP}</TableCell>
                      <TableCell>{row.FP}</TableCell>
                      <TableCell>{row.FN}</TableCell>
                      <TableCell>{parseFloat(row.Precision).toFixed(3)}</TableCell>
                      <TableCell>{parseFloat(row.Recall).toFixed(3)}</TableCell>
                      <TableCell>{parseFloat(row.F1).toFixed(3)}</TableCell>
                      <TableCell>{row.pred_num}</TableCell>
                      <TableCell>{row.true_num}</TableCell>
                      <TableCell>{row.count_accuracy}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow key={1}>
                    <TableCell>''</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </Paper>
            </div>

              : ""
            }
              <Typography variant="h5" color="primary">Summary Table</Typography>
              <Paper style={{ maxHeight: 400, overflow: "auto" }}>
              <Table className={classes.table}> 
                <TableHead>
                  <TableRow>
                    <TableCell>Picture</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right"># of Annotations</TableCell>

                    <TableCell align="right">
                      {this.props.aiSummary
                        ? "# of Annotations by Non-AI"
                        : this.state.km
                        ? "Creatures per km"
                        : "Creatures per square meter"}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {this.props.summary ? (
                    this.props.summary.data.map(row => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Avatar src={`/api/concepts/images/${row.id}`} />
                        </TableCell>
                        <TableCell component="th" scope="row">
                          {row.name}
                        </TableCell>
                        <TableCell align="right">{row.count}</TableCell>

                        <TableCell align="right">
                          {this.props.aiSummary
                            ? row.notai
                            : this.state.km
                            ? this.setDecimal(row.count / (dist * 1000))
                            : this.setDecimal(row.count / (dist * 2))}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow key={1}>
                      <TableCell>''</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
            <div>
              {this.props.summary && !this.props.aiSummary && (
                <Button
                  onClick={() => this.getTotal(this.props.summary.data)}
                  color="primary"
                >
                  Total
                </Button>
              )}
              {this.props.summary && !this.props.aiSummary && (
                <Button onClick={() => this.convertDistance()} color="primary">
                  Convert
                </Button>
              )}
              {this.state.showTotal ? (
                <div>
                  <Typography variant="body2" gutterBottom>
                    {"total species: " + this.state.total}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {"total annotations: " + this.state.anno}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {"total density(cr/m^2): " +
                      this.setDecimal(this.state.anno / (dist * 2))}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {"total distance covered(m): " + dist}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    total depth covered(m):{" "}
                    {depth < 0
                      ? "descended " + Math.abs(depth)
                      : "ascended " + Math.abs(depth)}
                  </Typography>
                </div>
              ) : (
                ""
              )}
            </div>
          </div>
        </Modal>
      </div>
    );
  }
}

Summary.propTypes = {
  classes: PropTypes.object.isRequired
};

// We need an intermediary variable for handling the recursive nesting.
const SummaryWrapped = withStyles(styles)(Summary);

export default SummaryWrapped;

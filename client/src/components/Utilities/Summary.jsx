import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Modal from '@material-ui/core/Modal';
import Avatar from '@material-ui/core/Avatar';
import Paper from '@material-ui/core/Paper';
import { getDistance } from 'geolib';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';

const styles = theme => ({
  paper: {
    position: 'absolute',
    width: theme.spacing(100),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(3),
    outline: 'none',
    transform: 'translate(-50%, -50%)',
    top: '50%',
    left: '50%'
  },
  root: {
    width: '100%',
    marginTop: theme.spacing(3),
    overflowX: 'auto'
  },
  table: {
    minWidth: 700
  },
  button: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(2)
  }
});

class Summary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      anno: null
    };
  }

  componentDidMount = () => {
    const { summary } = this.props;
    if (!summary) {
      return;
    }
    let anno = 0;
    summary.data.forEach(element => {
      anno += parseInt(element.count, 10);
    });
    this.setState({ anno });
  };

  setDecimal = data => {
    if (data === '') {
      return '0.0';
    }
    if (Number.isInteger(parseFloat(data))) {
      return data;
    }
    return parseFloat(data).toFixed(3);
  };

  render() {
    const {
      classes,
      gpsstart,
      gpsstop,
      startdepth,
      enddepth,
      open,
      handleClose,
      metrics,
      aiSummary,
      summary
    } = this.props;
    const { anno } = this.state;

    let start;
    let end;
    let lat_dist = 0;
    let depth = 0;
    let dist;

    if (gpsstart && gpsstop) {
      start = {
        latitude: gpsstart.x,
        longitude: gpsstart.y
      };
      end = { latitude: gpsstop.x, longitude: gpsstop.y };
      lat_dist = getDistance(start, end, 1);
    }

    if (startdepth && enddepth) {
      depth = startdepth - enddepth;
    }

    // kilometers
    dist = Math.sqrt(Math.pow(lat_dist, 2) + Math.pow(depth, 2)) / 1000;

    return (
      <Modal
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
        open={open}
        onClose={handleClose}
      >
        <Paper className={classes.paper}>
          {metrics ? (
            <div>
              <Typography variant="h5">Prediction Metrics</Typography>
              <Paper style={{ maxHeight: 400, overflow: 'auto' }}>
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
                    {metrics ? (
                      metrics.map(row => (
                        <TableRow key={row.conceptid}>
                          <TableCell>{row.conceptid}</TableCell>
                          <TableCell>{row.TP}</TableCell>
                          <TableCell>{row.FP}</TableCell>
                          <TableCell>{row.FN}</TableCell>
                          <TableCell>
                            {this.setDecimal(row.Precision)}
                          </TableCell>
                          <TableCell>{this.setDecimal(row.Recall)}</TableCell>
                          <TableCell>{this.setDecimal(row.F1)}</TableCell>
                          <TableCell>{this.setDecimal(row.pred_num)}</TableCell>
                          <TableCell>{this.setDecimal(row.true_num)}</TableCell>
                          <TableCell>
                            {this.setDecimal(row.count_accuracy)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow key={1}>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </div>
          ) : (
            <div>
              <Typography variant="h5">Summary Table</Typography>
              <Paper
                style={{
                  maxHeight: 400,
                  marginTop: 10,
                  marginBottom: 10,
                  overflow: 'auto'
                }}
              >
                <Table className={classes.table}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Concept</TableCell>
                      <TableCell align="right"># of Annotations</TableCell>
                      <TableCell align="right">
                        {aiSummary
                          ? '# of Annotations by Non-AI'
                          : 'Count per km'}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary
                      ? summary.data.map(row => (
                          <TableRow key={row.id}>
                            <TableCell component="th" scope="row">
                              <Grid
                                container
                                alignItems="center"
                                direction={'row'}
                              >
                                <Avatar
                                  style={{ marginRight: 15 }}
                                  src={`https://cdn.deepseaannotations.com/concept_images/${row.picture}`}
                                />
                                {row.name}
                              </Grid>
                            </TableCell>
                            <TableCell align="right">{row.count}</TableCell>
                            <TableCell align="right">
                              {aiSummary
                                ? row.notai
                                : this.setDecimal(row.count / dist)}
                            </TableCell>
                          </TableRow>
                        ))
                      : ''}
                  </TableBody>
                </Table>
              </Paper>
              <div>
                {summary && !aiSummary && (
                  <div>
                    <Typography variant="body2" gutterBottom>
                      Total annotations: {anno}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Total density: {this.setDecimal(anno / dist)} concepts/km
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Total distance covered: {this.setDecimal(dist)} km
                    </Typography>
                  </div>
                )}
              </div>
            </div>
          )}
        </Paper>
      </Modal>
    );
  }
}

// We need an intermediary variable for handling the recursive nesting.
const SummaryWrapped = withStyles(styles)(Summary);

export default SummaryWrapped;

import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Modal from '@material-ui/core/Modal';
import Button from '@material-ui/core/Button';
import Avatar from '@material-ui/core/Avatar';
import Paper from '@material-ui/core/Paper';
import geoLib from 'geolib';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';

const styles = theme => ({
  paper: {
    position: 'absolute',
    width: theme.spacing(100),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(4),
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
  }
});

class Summary extends React.Component {
  state = {
    showTotal: false,
    total: null,
    anno: null,
    km: false
  };

  getTotal = data => {
    let count = 0;
    let anno = 0;
    data.forEach(element => {
      if (element.rank === 'species') {
        count += 1;
      }
      anno += parseInt(element.count, 10);
    });
    this.setState({ showTotal: true, total: count, anno });
  };

  convertDistance = () => {
    const { km } = this.state;
    if (km) this.setState({ km: false });
    else this.setState({ km: true });
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

  kmOrsqMeter = (km, isHeader, rowCount, dist) => {
    if (isHeader) {
      return km ? 'Creatures per km' : 'Creatures per square meter';
    }
    return km
      ? this.setDecimal(rowCount / (dist * 1000))
      : this.setDecimal(rowCount / (dist * 2));
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
    const { showTotal, total, anno, km } = this.state;
    let start;
    let end;
    let dist;
    let depth;

    if (gpsstart && gpsstop) {
      start = {
        latitude: gpsstart.x,
        longitude: gpsstart.y
      };
      end = { latitude: gpsstop.x, longitude: gpsstop.y };
      dist = geoLib.getDistance(start, end, 1, 3);
    } else {
      dist = 1;
    }
    if (startdepth && enddepth) {
      depth = startdepth - enddepth;
    } else {
      depth = 0;
    }

    return (
      <div>
        <Modal
          aria-labelledby="simple-modal-title"
          aria-describedby="simple-modal-description"
          open={open}
          onClose={handleClose}
        >
          <div className={classes.paper}>
            {metrics ? (
              <div>
                <Typography variant="h5" color="primary">
                  Prediction Metrics
                </Typography>
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
                            <TableCell>
                              {this.setDecimal(row.pred_num)}
                            </TableCell>
                            <TableCell>
                              {this.setDecimal(row.true_num)}
                            </TableCell>
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
              ''
            )}
            <Typography variant="h5" color="primary">
              Summary Table
            </Typography>
            <Paper style={{ maxHeight: 400, overflow: 'auto' }}>
              <Table className={classes.table}>
                <TableHead>
                  <TableRow>
                    <TableCell>Picture</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right"># of Annotations</TableCell>

                    <TableCell align="right">
                      {aiSummary
                        ? '# of Annotations by Non-AI'
                        : this.kmOrsqMeter(km, true)}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary ? (
                    summary.data.map(row => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Avatar
                            src={`https://cdn.deepseaannotations.com/concept_images/${row.picture}`}
                          />
                        </TableCell>
                        <TableCell component="th" scope="row">
                          {row.name}
                        </TableCell>
                        <TableCell align="right">{row.count}</TableCell>

                        <TableCell align="right">
                          {aiSummary
                            ? row.notai
                            : this.kmOrsqMeter(km, false, row.count, dist)}
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
              {summary && !aiSummary && (
                <Button
                  onClick={() => this.getTotal(summary.data)}
                  color="primary"
                >
                  Total
                </Button>
              )}
              {summary && !aiSummary && (
                <Button onClick={() => this.convertDistance()} color="primary">
                  Convert
                </Button>
              )}
              {showTotal ? (
                <div>
                  <Typography variant="body2" gutterBottom>
                    {`total species: ${total}`}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {`total annotations: ${anno}`}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {`total density(cr/m^2): ${this.setDecimal(
                      anno / (dist * 2)
                    )}`}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {`total distance covered(m): ${dist}`}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    total depth covered(m):{' '}
                    {depth < 0
                      ? `descended ${Math.abs(depth)}`
                      : `ascended ${Math.abs(depth)}`}
                  </Typography>
                </div>
              ) : (
                ''
              )}
            </div>
          </div>
        </Modal>
      </div>
    );
  }
}

// We need an intermediary variable for handling the recursive nesting.
const SummaryWrapped = withStyles(styles)(Summary);

export default SummaryWrapped;

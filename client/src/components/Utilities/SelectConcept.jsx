import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import { Checkbox, Grid } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import Tooltip from '@material-ui/core/Tooltip';

const styles = theme => ({
  collection: {
    textTransform: 'none'
  },
  formControl: {
    marginTop: theme.spacing(1.5),
    maxHeight: '280px',
    overflow: 'auto'
  },
  group: {
    marginLeft: 15
  },
  button: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing()
  },
  list: {
    marginTop: theme.spacing(2),
    overflow: 'auto',
    maxHeight: (280 + theme.spacing(4)).toString() + 'px'
  }
});

class SelectConcept extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      concepts: [],
      conceptCollections: []
    };
  }

  componentDidMount = async () => {
    let concepts = await this.props.getConcepts();
    let conceptCollections = await this.props.getConceptCollections();

    this.setState({
      concepts: concepts,
      conceptCollections: conceptCollections
    });
  };

  render() {
    const { classes, value, handleChangeList } = this.props;
    const { concepts } = this.state;

    return (
      <Grid container spacing={5}>
        <Grid item>
          <Typography>Select concepts</Typography>
          <div>
            <Button
              className={classes.button}
              color="primary"
              onClick={() => {
                this.props.handleSelectAll(concepts, value, 'selectedConcepts');
              }}
            >
              Select All
            </Button>
            <Button
              className={classes.button}
              color="primary"
              onClick={() => {
                this.props.handleUnselectAll('selectedConcepts');
              }}
            >
              Unselect All
            </Button>
          </div>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup
              className={classes.group}
              value={value}
              onChange={handleChangeList}
            >
              {this.state.concepts
                .filter(concept => concept.rank)
                .map(concept => (
                  <FormControlLabel
                    key={concept.id}
                    value={concept.id.toString()}
                    control={<Checkbox color="primary" />}
                    label={<div>{concept.id + '. ' + concept.name}</div>}
                    checked={this.props.value.includes(concept.id.toString())}
                  />
                ))}
            </FormGroup>
          </FormControl>
        </Grid>
        <Grid item>
          <Typography>Select concept collection</Typography>
          <List className={classes.list}>
            {this.state.conceptCollections.map(conceptCollection => (
              <ListItem key={conceptCollection.id}>
                <Tooltip
                  title={
                    !conceptCollection.description
                      ? ''
                      : conceptCollection.description
                  }
                  placement="bottom-start"
                >
                  <div>
                    <Button
                      className={classes.collection}
                      variant="outlined"
                      value={conceptCollection.id.toString()}
                      disabled={!conceptCollection.conceptids[0]}
                      onClick={() => {
                        if (conceptCollection.conceptids[0]) {
                          let conceptids = [];
                          this.state.concepts.forEach(concept => {
                            if (
                              conceptCollection.conceptids.includes(concept.id)
                            ) {
                              conceptids.push(concept.id.toString());
                            }
                          });
                          this.props.handleChange(conceptids);
                        }
                      }}
                    >
                      {conceptCollection.name +
                        (!conceptCollection.conceptids[0]
                          ? ' (No Concepts)'
                          : '')}
                    </Button>
                  </div>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    );
  }
}

SelectConcept.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(SelectConcept);

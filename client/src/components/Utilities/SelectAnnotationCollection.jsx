import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import { Checkbox } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';

const styles = theme => ({
  formControl: {
    marginTop: theme.spacing(2),
    maxHeight: '400px',
    overflow: 'auto'
  },
  group: {
    marginLeft: 15
  }
});

class SelectAnnotationCollection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      collections: []
    };
  }

  componentDidMount = async () => {
    const { getAnnotationCollections } = this.props;

    const collections = await getAnnotationCollections();

    this.setState({
      collections
    });
  };

  render() {
    const { classes, value, handleChangeList } = this.props;
    const { collections } = this.state;

    if (!collections) return <div>Loading...</div>;

    return (
      <>
        <Typography>Select Annotation Collection</Typography>
        <FormControl component="fieldset" className={classes.formControl}>
          <FormGroup
            name="collection"
            className={classes.group}
            value={value}
            onChange={handleChangeList}
          >
            {collections.map(collection => (
              <FormControlLabel
                key={collection.id}
                value={collection.id.toString()}
                control={<Checkbox color="secondary" />}
                label={collection.name}
                checked={value.includes(collection.id.toString())}
              />
            ))}
          </FormGroup>
        </FormControl>
      </>
    );
  }
}

export default withStyles(styles)(SelectAnnotationCollection);

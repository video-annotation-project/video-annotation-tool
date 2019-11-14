import React from 'react';
import Button from '@material-ui/core/Button';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { Checkbox, Switch } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';

import VerifyAnnotationCollection from '../Utilities/SelectAnnotationCollection';

function VerifySelection(props) {
  const {
    selectedAnnotationCollections,
    toggleSelection,
    getAnnotationCollections,
    handleChangeList,
    handleChangeSwitch,
    selectedTrackingFirst,
    excludeTracking
  } = props;

  return (
    <div>
      <Grid container justify="center">
        <Grid item style={{ margin: '60px' }}>
          <>
            <VerifyAnnotationCollection
              value={selectedAnnotationCollections}
              getAnnotationCollections={getAnnotationCollections}
              selectedAnnotationCollections={selectedAnnotationCollections}
              handleChangeList={handleChangeList(
                selectedAnnotationCollections,
                'selectedAnnotationCollections'
              )}
            />
            <div style={{ marginTop: '40px' }}>
              <FormControl>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedTrackingFirst}
                        onChange={handleChangeSwitch('selectedTrackingFirst')}
                        value="selectedTrackingFirst"
                        color="primary"
                        disabled={!excludeTracking}
                      />
                    }
                    label="Tracking Video Verification"
                  />
                </FormGroup>
                <FormGroup>
                  <FormControlLabel
                    control={
                      //   <Checkbox
                      //   checked={state.checkedA}
                      //   onChange={handleChange('checkedA')}
                      //     value="excludeTracking"

                      // />
                      <Checkbox
                        checked={excludeTracking}
                        onChange={handleChangeSwitch('excludeTracking')}
                        value="excludeTracking"
                        color="primary"
                        disabled={selectedTrackingFirst}
                      />
                    }
                    label="Exclude Tracking"
                  />
                </FormGroup>
              </FormControl>
            </div>
          </>
        </Grid>
      </Grid>
      <Grid container justify="center">
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            disabled={selectedAnnotationCollections.length === 0}
            onClick={toggleSelection}
          >
            Next
          </Button>
        </Grid>
      </Grid>
    </div>
  );
}

export default VerifySelection;

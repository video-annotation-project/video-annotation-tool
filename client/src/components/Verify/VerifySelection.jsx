import React from 'react';
import { Button, Checkbox, FormControl, FormControlLabel, Grid } from '@material-ui/core';

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
                <FormControlLabel
                  control={
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
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedTrackingFirst}
                      onChange={handleChangeSwitch('selectedTrackingFirst')}
                      value="selectedTrackingFirst"
                      color="primary"
                      disabled={!excludeTracking}
                    />
                  }
                  label="Tracking Video Verification"
                />
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

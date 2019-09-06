import React, { Component } from 'react';
import axios from 'axios';
import { Button, Typography } from '@material-ui/core';
import Swal from 'sweetalert2/src/sweetalert2';

import VerifySelection from './VerifySelection';
import VerifyAnnotations from './VerifyAnnotations';

const FPS = 29.97002997002997;

class Verify extends Component {
  constructor(props) {
    super(props);
    const selectionMounted = JSON.parse(
      localStorage.getItem('selectionMounted')
    );
    const ignoredAnnotations = JSON.parse(
      localStorage.getItem('ignoredAnnotations')
    );
    const annotations = JSON.parse(localStorage.getItem('verifyAnnotation'));
    const noAnnotations = JSON.parse(localStorage.getItem('noAnnotations'));
    const index = JSON.parse(localStorage.getItem('curIndex'));
    const selectedTrackingFirst = JSON.parse(
      localStorage.getItem('selectedTrackingFirst')
    );
    const selectedAnnotationCollections = JSON.parse(
      localStorage.getItem('selectedAnnotationCollections')
    );

    this.state = {
      ignoredAnnotations,
      selectedAnnotationCollections,
      selectedTrackingFirst,
      selectionMounted,
      noAnnotations,
      index,
      excludeTracking: false,
      annotations,
      annotating: false,
      end: false
    };
  }

  toggleSelection = async () => {
    const { selectedAnnotationCollections, selectionMounted } = this.state;
    let annotations = [];
    if (!selectionMounted) {
      localStorage.setItem('selectionMounted', !selectionMounted);
      localStorage.setItem('noAnnotations', false);
      this.resetState(
        this.setState({
          selectionMounted: !selectionMounted,
          noAnnotations: false
        })
      );
    } else {
      if (selectedAnnotationCollections.length) {
        annotations = await this.getAnnotationsFromCollection();
      } else {
        annotations = await this.getAnnotations();
      }
      if (annotations.length < 1) {
        localStorage.setItem('noAnnotations', true);
        localStorage.setItem('selectionMounted', !selectionMounted);
        this.setState({
          noAnnotations: true,
          selectionMounted: !selectionMounted
        });
      } else {
        try {
          localStorage.setItem('selectionMounted', !selectionMounted);
          localStorage.setItem('verifyAnnotation', JSON.stringify(annotations));
        } catch (error) {
          Swal.fire('Error', '', 'error');
        }
        this.setState({
          selectionMounted: !selectionMounted,
          annotations
        });
      }
    }
  };

  getAnnotationCollections = async () => {
    return axios
      .get(`/api/collections/annotations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })
      .then(res => res.data)
      .catch(error => {
        console.log(error);
      });
  };

  getAnnotationsFromCollection = async () => {
    const {
      selectedAnnotationCollections,
      excludeTracking,
      selectedTrackingFirst
    } = this.state;
    return axios
      .get(`/api/annotations/collections`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          selectedAnnotationCollections,
          excludeTracking,
          selectedTrackingFirst
        }
      })
      .then(res => {
        return res.data;
      })
      .catch(error => {
        console.log(error);
      });
  };

  getVideoCollections = async () => {
    return axios
      .get(`/api/collections/videos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.data)
      .catch(error => {
        console.log(error);
      });
  };

  removeFromIgnoreList = annotation => {
    const { ignoredAnnotations } = this.state;
    const ignored = ignoredAnnotations.filter(x => x.id !== annotation.id);
    localStorage.setItem('ignoredAnnotations', JSON.stringify(ignored));
    this.setState({
      ignoredAnnotations: ignored
    });
  };

  populateIgnoreList = annotation => {
    const { ignoredAnnotations } = this.state;
    ignoredAnnotations.push(annotation);
    localStorage.setItem(
      'ignoredAnnotations',
      JSON.stringify(ignoredAnnotations)
    );
    this.setState({
      ignoredAnnotations
    });
  };

  handleChangeSwitch = type => event => {
    if (type === 'selectedTrackingFirst') {
      localStorage.setItem('selectedTrackingFirst', event.target.checked);
    }
    this.setState({
      [type]: event.target.checked
    });
  };

  handleChangeList = (stateVariable, type) => event => {
    let value;
    if (!stateVariable.includes(event.target.value)) {
      value = stateVariable.concat(event.target.value);
    } else {
      value = stateVariable.filter(typeid => typeid !== event.target.value);
    }
    if (type === 'selectedAnnotationCollections') {
      localStorage.setItem(
        'selectedAnnotationCollections',
        JSON.stringify(value)
      );
    }
    this.setState({
      [type]: value
    });
  };

  resetState = callback => {
    localStorage.setItem('curIndex', 0);
    localStorage.setItem('selectedTrackingFirst', false);
    this.setState(
      {
        selectedTrackingFirst: false,
        excludeTracking: false,
        index: 0,
        end: false
      },
      callback
    );
  };

  verifyFrame = async () => {
    const { index, annotations } = this.state;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      framenum: annotations[index].timeinvideo * 29.97002997003,
      videoid: annotations[index].videoid
    };
    try {
      const res = await axios.post(
        `/api/annotations/verifyframe`,
        body,
        config
      );
      if (res) {
        console.log('frame inserted');
        return;
      }
    } catch (error) {
      Swal.fire('Error POSTING verify frame', '', 'error');
    }
  };

  handleNext = callback => {
    const { index, annotations } = this.state;
    if (
      annotations &&
      annotations.length &&
      (annotations.length === index + 1 ||
        annotations[index].videoid !== annotations[index + 1].videoid ||
        Math.round(annotations[index].timeinvideo * FPS) !==
          Math.round(annotations[index + 1].timeinvideo * FPS))
    ) {
      Swal.fire({
        title: 'Finished with current frame',
        text: 'Move on to next frame?',
        type: 'info',
        showCancelButton: true,
        cancelButtonText: 'Add annotations',
        confirmButtonText: 'Next',
        reverseButtons: true
      }).then(result => {
        if (result.value) {
          this.verifyFrame();
          localStorage.setItem('ignoredAnnotations', JSON.stringify([]));
          localStorage.setItem('curIndex', index + 1);
          this.setState(
            {
              ignoredAnnotations: [],
              index: index + 1,
              annotating: false
            },
            callback
          );
        }
        if (result.dismiss === 'cancel') {
          // Add annotations here
          this.setState(
            {
              annotating: true
            },
            callback
          );
        }
      });
    } else {
      localStorage.setItem('curIndex', index + 1);
      this.setState(
        {
          index: index + 1
        },
        callback
      );
    }
  };

  resetLocalStorage = () => {
    localStorage.setItem('ignoredAnnotations', JSON.stringify([]));
    localStorage.setItem('selectedAnnotationCollections', JSON.stringify([]));
    localStorage.setItem('selectionMounted', true);
    localStorage.setItem('videoDialogOpen', false);
    localStorage.setItem('selectedTrackingFirst', false);
    localStorage.setItem('curIndex', 0);
    localStorage.removeItem('verifyAnnotation');
    localStorage.removeItem('noAnnotations');
    this.resetState(
      this.setState({
        selectedAnnotationCollections: [],
        ignoredAnnotations: [],
        selectionMounted: true,
        index: 0,
        noAnnotations: false,
        annotations: [],
        selectedTrackingFirst: false
      })
    );
  };

  render() {
    const {
      selectionMounted,
      selectedAnnotationCollections,
      selectedTrackingFirst,
      excludeTracking,
      annotations,
      noAnnotations,
      index,
      annotating,
      ignoredAnnotations,
      end
    } = this.state;

    console.log(selectedAnnotationCollections);
    console.log(annotations);

    if (annotations && index >= annotations.length + 1) {
      this.resetLocalStorage();
      return <div />;
    }

    let selection = '';
    if (selectionMounted) {
      selection = (
        <VerifySelection
          selectedAnnotationCollections={selectedAnnotationCollections}
          selectedTrackingFirst={selectedTrackingFirst}
          excludeTracking={excludeTracking}
          getAnnotationCollections={this.getAnnotationCollections}
          handleChangeSwitch={this.handleChangeSwitch}
          handleChangeList={this.handleChangeList}
          toggleSelection={this.toggleSelection}
        />
      );
    } else if (noAnnotations) {
      selection = (
        <div style={{ margin: '30px' }}>
          <Typography>All Verified</Typography>
          <Button
            style={{ marginTop: '15px' }}
            variant="contained"
            color="primary"
            onClick={() => {
              localStorage.setItem('selectionMounted', !selectionMounted);
              localStorage.setItem('noAnnotations', false);
              this.resetState();
              this.setState({
                selectionMounted: !selectionMounted,
                noAnnotations: false
              });
            }}
          >
            Reset
          </Button>
        </div>
      );
    } else {
      selection = (
        <VerifyAnnotations
          selectedAnnotationCollections={selectedAnnotationCollections}
          populateIgnoreList={this.populateIgnoreList}
          removeFromIgnoreList={this.removeFromIgnoreList}
          ignoredAnnotations={ignoredAnnotations}
          annotation={annotations[index]}
          index={index}
          handleNext={this.handleNext}
          toggleSelection={this.toggleSelection}
          size={annotations.length}
          tracking={selectedTrackingFirst}
          resetLocalStorage={this.resetLocalStorage}
          collectionFlag={selectedAnnotationCollections.length}
          excludeTracking={excludeTracking}
          annotating={annotating}
          end={end}
        />
      );
    }

    return <>{selection}</>;
  }
}

export default Verify;

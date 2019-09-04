import React, { Component } from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import { Button, Typography } from '@material-ui/core';
import Swal from 'sweetalert2/src/sweetalert2';

import VerifySelection from './VerifySelection';
import VerifyAnnotations from './VerifyAnnotations';

const FPS = 29.97002997002997;

const styles = theme => ({
  button: {
    margin: theme.spacing()
  },
  resetContainer: {
    padding: theme.spacing(3)
  },
  list: {
    width: '100%',
    backgroundColor: theme.palette.background.paper
  },
  item: {
    display: 'inline',
    paddingTop: 0,
    width: '1300px',
    height: '730px',
    paddingLeft: 0
  },
  img: {
    padding: theme.spacing(3),
    width: '1280px',
    height: '720px'
  },
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gridGap: theme.spacing(3)
  },
  paper: {
    padding: theme.spacing(5)
  }
});

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
      selectedUsers: [],
      selectedVideos: [],
      selectedConcepts: [],
      selectedUnsure: false,
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
          Swal.fire(
            'Storage is Full. Please select less annotations',
            '',
            'error'
          );
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

  getUsers = async () => {
    return axios
      .get(`/api/users?noAi=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.data)
      .catch(error => {
        console.log(error);
      });
  };

  getVideos = async () => {
    const { selectedUsers } = this.state;
    return axios
      .get(`/api/annotations/verified`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: {
          verifiedOnly: '-1',
          selectedUsers
        }
      })
      .then(res => res.data)
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

  getConcepts = async () => {
    const { selectedUsers, selectedVideos } = this.state;

    return axios
      .get(`/api/annotations/verified`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          verifiedOnly: '-1',
          selectedUsers,
          selectedVideos
        }
      })
      .then(res => res.data)
      .catch(error => {
        console.log(error);
      });
  };

  getConceptCollections = async () => {
    return axios
      .get(`/api/collections/concepts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.data)
      .catch(error => {
        console.log(error);
      });
  };

  getUnsure = async () => {
    const { selectedUsers, selectedVideos, selectedConcepts } = this.state;

    return axios
      .get(`/api/annotations/verified`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          verifiedOnly: '-1',
          selectedUsers,
          selectedVideos,
          selectedConcepts
        }
      })
      .then(res => res.data)
      .catch(error => {
        console.log(error);
      });
  };

  getAnnotations = async () => {
    const {
      selectedTrackingFirst,
      selectedUsers,
      selectedVideos,
      selectedConcepts,
      selectedUnsure,
      excludeTracking
    } = this.state;

    return axios
      .get(`/api/annotations/unverified`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          selectedUsers,
          selectedVideos,
          selectedConcepts,
          selectedUnsure,
          selectedTrackingFirst,
          excludeTracking
        }
      })
      .then(res => res.data)
      .catch(error => {
        console.log(error);
      });
  };

  removeFromIgnoreList = annotation => {
    const { ignoredAnnotations } = this.state;
    var ignored = ignoredAnnotations.filter(x => x.id !== annotation.id);
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

  selectUser = user => {
    const { selectedUsers } = this.state;
    this.setState({
      selectedUsers: selectedUsers.concat(user)
    });
  };

  handleChange = type => value => {
    this.setState({
      [type]: value
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

  handleSelectAll = (data, dataSelected, stepInfo) => {
    const selected = dataSelected;
    data.forEach(row => {
      if (row.id) {
        if (!selected.includes(row.id.toString())) {
          selected.push(row.id.toString());
        }
      }
    });
    this.setState({
      [stepInfo]: selected
    });
  };

  handleUnselectAll = stepInfo => {
    this.setState({
      [stepInfo]: []
    });
  };

  resetStep = step => {
    switch (step) {
      case 0:
        localStorage.setItem(
          'selectedAnnotationCollections',
          JSON.stringify([])
        );
        this.setState({
          selectedAnnotationCollections: []
        });
        return;
      case 1:
        this.setState({
          selectedUsers: []
        });
        return;
      case 2:
        this.setState({
          selectedVideos: []
        });
        return;
      case 3:
        this.setState({
          selectedConcepts: []
        });
        return;
      case 4:
        localStorage.setItem('selectedTrackingFirst', false);
        this.setState({
          selectedUnsure: false,
          selectedTrackingFirst: false
        });
        break;
      default:
    }
  };

  resetState = callback => {
    localStorage.setItem('curIndex', 0);
    localStorage.setItem('selectedTrackingFirst', false);
    this.setState(
      {
        selectedUsers: [],
        selectedVideos: [],
        selectedConcepts: [],
        selectedUnsure: false,
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
    localStorage.setItem('selectionMounted', true);
    localStorage.setItem('videoDialogOpen', false);
    localStorage.setItem('selectedTrackingFirst', false);
    localStorage.setItem('curIndex', 0);
    localStorage.removeItem('verifyAnnotation');
    localStorage.removeItem('noAnnotations');
    this.resetState(
      this.setState({
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
      selectedUsers,
      selectedVideos,
      selectedConcepts,
      selectedUnsure,
      selectedTrackingFirst,
      excludeTracking,
      annotations,
      noAnnotations,
      index,
      annotating,
      ignoredAnnotations,
      end
    } = this.state;
    if (annotations && index >= annotations.length + 1) {
      this.resetLocalStorage();
      return <div />;
    }

    let selection = '';
    if (selectionMounted) {
      selection = (
        <VerifySelection
          selectedAnnotationCollections={selectedAnnotationCollections}
          selectedUsers={selectedUsers}
          selectedVideos={selectedVideos}
          selectedConcepts={selectedConcepts}
          selectedUnsure={selectedUnsure}
          selectedTrackingFirst={selectedTrackingFirst}
          excludeTracking={excludeTracking}
          getAnnotationCollections={this.getAnnotationCollections}
          getAnnotationsFromCollection={this.getAnnotationsFromCollection}
          getUsers={this.getUsers}
          getVideos={this.getVideos}
          getVideoCollections={this.getVideoCollections}
          getConcepts={this.getConcepts}
          getConceptCollections={this.getConceptCollections}
          getUnsure={this.getUnsure}
          handleChangeSwitch={this.handleChangeSwitch}
          handleChange={this.handleChange}
          handleChangeList={this.handleChangeList}
          resetStep={this.resetStep}
          resetState={this.resetState}
          toggleSelection={this.toggleSelection}
          selectUser={this.selectUser}
          handleSelectAll={this.handleSelectAll}
          handleUnselectAll={this.handleUnselectAll}
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

export default withStyles(styles)(Verify);

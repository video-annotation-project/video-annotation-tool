import React, { Component } from 'react';
import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import { Grid, Typography } from '@material-ui/core';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import Swal from 'sweetalert2/src/sweetalert2';

import VerifySelectUser from '../Utilities/SelectUser';
import VerifySelectVideo from '../Utilities/SelectVideo';
import VerifySelectConcept from '../Utilities/SelectConcept';
import CollectionInfo from '../Utilities/CollectionInfo';

const styles = theme => ({
  button: {
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5)
  },
  formControl: {
    minWidth: 200,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    marginLeft: theme.spacing()
  },
  text: {
    marginTop: theme.spacing(4.5)
  },
  infoButton: {
    marginTop: theme.spacing(4)
  },
  grid: {
    margin: theme.spacing(6)
  },
  collectionButton: {
    marginRight: theme.spacing(),
    marginBottom: theme.spacing(2)
  }
});

function getSteps() {
  return ['Users', 'Videos', 'Concepts', 'Insert'];
}

class AnnotationCollection extends Component {
  toastPopup = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      selectedCollection: '',
      selectedCollectionCounts: [],
      selectedVideos: [],
      selectedConcepts: [],
      annotationCount: '',
      trackingCount: '',
      collections: [],
      includeTracking: false,
      infoDialogOpen: false,
      activeStep: 0
    };
  }

  componentDidMount() {
    return this.loadCollections();
  }

  promiseResolver = async promise => {
    await Promise.resolve(promise.response).then(object => {
      this.toastPopup.fire({
        type: 'error',
        title: object.data.detail
      });
    });
  };

  loadCollections = callback => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    return axios.get('/api/collections/annotations', config).then(res => {
      this.setState(
        {
          collections: res.data
        },
        callback
      );
    });
  };

  handleChangeCollection = async event => {
    this.setState({
      selectedCollection: event.target.value,
      selectedCollectionCounts: await this.getCollectionCounts(
        event.target.value
      )
    });
  };

  getCollectionCounts = async selectedCollection => {
    let ret;
    try {
      const res = await axios.get(`/api/collections/annotations/counts`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          ids: [selectedCollection]
        }
      });
      ret = res.data;
    } catch (error) {
      console.log(error);
      ret = error;
    }
    return ret;
  };

  createAnnotationCollection = async () => {
    Swal.mixin({
      confirmButtonText: 'Next',
      showCancelButton: true,
      progressSteps: ['1', '2']
    })
      .queue([
        {
          title: 'Collection Name',
          input: 'text'
        },
        {
          title: 'Description',
          input: 'textarea'
        }
      ])
      .then(async result => {
        if (result.value) {
          const body = {
            name: result.value[0],
            description: result.value[1]
          };
          const config = {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          };
          try {
            let data = await axios.post(
              '/api/collections/annotations',
              body,
              config
            );
            Swal.fire({
              title: 'Collection Created!',
              confirmButtonText: 'Lovely!'
            });
            await this.loadCollections();
            this.setState({
              selectedCollection: data.data.id
            });
          } catch (error) {
            this.promiseResolver(error);
          }
        }
      });
  };

  deleteAnnotationCollection = async () => {
    const { selectedCollection } = this.state;
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async result => {
      if (result.value) {
        try {
          const response = await axios.delete(
            `/api/collections/annotations/${selectedCollection}`,
            config
          );
          if (response.status === 200) {
            Swal.fire('Deleted!', 'Collection has been deleted.', 'success');
            this.loadCollections();
            this.setState({
              selectedCollection: ''
            });
          }
        } catch (error) {
          this.promiseResolver(error);
        }
      }
    });
  };

  insertAnnotationsToCollection = () => {
    const {
      selectedCollection,
      selectedUsers,
      selectedVideos,
      selectedConcepts,
      includeTracking
    } = this.state;
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    };
    const body = {
      selectedUsers,
      selectedVideos,
      selectedConcepts,
      includeTracking
    };
    try {
      axios
        .post(
          `/api/collections/annotations/${selectedCollection}`,
          body,
          config
        )
        .then(async () => {
          Swal.close();
          Swal.fire({
            title: 'Inserted!',
            confirmButtonText: 'Lovely!'
          });
          this.setState({
            selectedCollectionCounts: await this.getCollectionCounts(
              selectedCollection
            )
          });
          this.loadCollections();
        })
        .catch(error => {
          this.promiseResolver(error);
        });
    } catch (error) {
      this.promiseResolver(error);
    }
  };

  getUsers = async () => {
    return axios
      .get(`/api/users?noAi=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.data)
      .catch(error => {
        console.log(error);
        this.promiseResolver(error);
      });
  };

  getVideos = async () => {
    const { selectedUsers } = this.state;
    return axios
      .get(`/api/annotations/verified`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: {
          verifiedOnly: '0',
          selectedUsers
        }
      })
      .then(res => {
        Swal.close();
        return res.data;
      })
      .catch(error => {
        console.log(error);
        this.promiseResolver(error);
      });
  };

  getVideoCollections = async () => {
    return axios
      .get(`/api/collections/videos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        Swal.close();
        return res.data;
      })
      .catch(error => {
        console.log(error);
        this.promiseResolver(error);
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
          verifiedOnly: '0',
          selectedUsers,
          selectedVideos
        }
      })
      .then(res => {
        Swal.close();
        return res.data;
      })
      .catch(error => {
        console.log(error);
        this.promiseResolver(error);
      });
  };

  getConceptCollections = async () => {
    return axios
      .get(`/api/collections/concepts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        Swal.close();
        return res.data;
      })
      .catch(error => {
        console.log(error);
        this.promiseResolver(error);
      });
  };

  getAnnotations = async () => {
    const { selectedUsers, selectedVideos, selectedConcepts } = this.state;

    return axios
      .get(`/api/collections/annotations/trackingCounts`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          selectedUsers,
          selectedVideos,
          selectedConcepts
        }
      })
      .then(res => {
        this.setState({
          annotationCount: res.data[0].annotationcount,
          trackingCount: res.data[0].trackingcount
        });
        Swal.close();
      })
      .catch(error => {
        console.log(JSON.stringify(error));
        this.promiseResolver(error);
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
    this.setState({
      [type]: event.target.checked
    });
  };

  handleChangeList = (stateVariable, type) => event => {
    if (!stateVariable.includes(event.target.value.toString())) {
      this.setState({
        [type]: stateVariable.concat(event.target.value)
      });
    } else {
      this.setState({
        [type]: stateVariable.filter(typeid => typeid !== event.target.value)
      });
    }
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
        this.setState({
          selectedUsers: []
        });
        break;
      case 1:
        this.setState({
          selectedVideos: []
        });
        break;
      case 2:
        this.setState({
          selectedConcepts: []
        });
        break;
      case 3:
        this.setState({
          includeTracking: false
        });
        break;
      default:
    }
  };

  resetState = () => {
    this.setState({
      selectedUsers: [],
      selectedVideos: [],
      selectedConcepts: [],
      includeTracking: false,
      activeStep: 0
    });
  };

  toggleInfo = () => {
    this.setState(prevState => ({
      infoDialogOpen: !prevState.infoDialogOpen
    }));
  };

  showCollection = () => {
    const { classes } = this.props;
    const {
      collections,
      selectedCollection,
      selectedCollectionCounts,
      infoDialogOpen
    } = this.state;
    const data = collections.find(col => {
      return col.id === selectedCollection;
    });
    if (data.users[0]) {
      return (
        <>
          <Button
            className={classes.infoButton}
            variant="outlined"
            color="primary"
            onClick={this.toggleInfo}
          >
            Collection Info
          </Button>
          <CollectionInfo
            open={infoDialogOpen}
            onClose={this.toggleInfo}
            counts={selectedCollectionCounts}
            data={data}
          />
        </>
      );
    }
    return (
      <Typography variant="subtitle1" className={classes.text}>
        No annotations
      </Typography>
    );
  };

  getStepForm = step => {
    const {
      includeTracking,
      selectedUsers,
      selectedVideos,
      selectedConcepts,
      annotationCount,
      trackingCount
    } = this.state;
    switch (step) {
      case 0:
        return (
          <VerifySelectUser
            value={selectedUsers}
            getUsers={this.getUsers}
            selectUser={this.selectUser}
            handleChangeList={this.handleChangeList(
              selectedUsers,
              'selectedUsers'
            )}
            handleSelectAll={this.handleSelectAll}
            handleUnselectAll={this.handleUnselectAll}
          />
        );
      case 1:
        return (
          <VerifySelectVideo
            value={selectedVideos}
            getVideos={this.getVideos}
            getVideoCollections={this.getVideoCollections}
            handleChange={this.handleChange('selectedVideos')}
            handleChangeList={this.handleChangeList(
              selectedVideos,
              'selectedVideos'
            )}
            handleSelectAll={this.handleSelectAll}
            handleUnselectAll={this.handleUnselectAll}
          />
        );
      case 2:
        return (
          <VerifySelectConcept
            value={selectedConcepts}
            getConcepts={this.getConcepts}
            getConceptCollections={this.getConceptCollections}
            handleChange={this.handleChange('selectedConcepts')}
            handleChangeList={this.handleChangeList(
              selectedConcepts,
              'selectedConcepts'
            )}
            handleSelectAll={this.handleSelectAll}
            handleUnselectAll={this.handleUnselectAll}
          />
        );
      case 3:
        return (
          <>
            <Typography>
              Number of User Annotations: {annotationCount}
            </Typography>
            <Typography>
              Number of Tracking Annotations: {trackingCount}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={includeTracking}
                  onChange={this.handleChangeSwitch('includeTracking')}
                  value="includeTracking"
                  color="primary"
                  disabled={trackingCount === '0'}
                />
              }
              label="Include tracking annotations"
            />
          </>
        );
      default:
        return 'Unknown step';
    }
  };

  checkButtonDisabled = step => {
    const {
      selectedCollection,
      selectedUsers,
      selectedVideos,
      selectedConcepts
    } = this.state;
    switch (step) {
      case 0:
        return selectedUsers.length === 0;
      case 1:
        return selectedVideos.length === 0;
      case 2:
        return selectedConcepts.length === 0;
      case 3:
        return selectedCollection === '';
      default:
        return false;
    }
  };

  handleNext = () => {
    Swal.fire({
      title: 'Loading...',
      showConfirmButton: false,
      onBeforeOpen: () => {
        Swal.showLoading();
      }
    });
    this.setState(state => ({
      activeStep: state.activeStep + 1
    }));
  };

  handleBack = step => {
    this.resetStep(step);
    this.setState(state => ({
      activeStep: state.activeStep - 1
    }));
  };

  render() {
    const { activeStep, collections, selectedCollection } = this.state;
    const { classes } = this.props;
    const steps = getSteps();

    return (
      <>
        <Grid container justify="center">
          <Grid item>
            <Grid container spacing={4}>
              <Grid item>
                <FormControl className={classes.formControl}>
                  <InputLabel>Select collection</InputLabel>
                  <Select
                    value={selectedCollection}
                    onChange={this.handleChangeCollection}
                    autoWidth
                  >
                    <MenuItem value="">Select collection</MenuItem>
                    {collections.map(collection => {
                      return (
                        <MenuItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </MenuItem>
                      );
                    })}
                  </Select>
                  {selectedCollection === '' ||
                  !collections.filter(collection => {
                    return collection.id === selectedCollection;
                  })[0].description ? (
                    ''
                  ) : (
                    <FormHelperText>
                      {
                        collections.filter(collection => {
                          return collection.id === selectedCollection;
                        })[0].description
                      }
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item>
                {selectedCollection ? this.showCollection() : ''}
              </Grid>
            </Grid>
            <div>
              <Button
                className={classes.collectionButton}
                disabled={selectedCollection === ''}
                onClick={this.deleteAnnotationCollection}
              >
                Delete This Collection
              </Button>
              <Button
                className={classes.collectionButton}
                onClick={this.createAnnotationCollection}
              >
                New Annotation Collection
              </Button>
            </div>
          </Grid>
        </Grid>
        <Grid container justify="center">
          <Grid item xs={5}>
            <Stepper
              activeStep={activeStep}
              style={{ backgroundColor: 'transparent' }}
            >
              {steps.map(label => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Grid>
        </Grid>
        <Grid container justify="center">
          <Grid item className={classes.grid}>
            {this.getStepForm(activeStep)}
          </Grid>
        </Grid>
        <Grid container justify="center">
          <Grid item>
            <Button
              variant="contained"
              onClick={this.resetState}
              className={classes.button}
            >
              Reset All
            </Button>
            {activeStep !== 0 ? (
              <Button
                variant="contained"
                onClick={() => {
                  this.handleBack(activeStep);
                }}
                className={classes.button}
              >
                Back
              </Button>
            ) : (
              ''
            )}
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                disabled={this.checkButtonDisabled(activeStep)}
                onClick={() => {
                  Swal.fire({
                    title: 'Loading...',
                    showConfirmButton: false,
                    onBeforeOpen: () => {
                      Swal.showLoading();
                    }
                  });
                  this.insertAnnotationsToCollection('annotations');
                }}
                className={classes.button}
              >
                Add Annotations
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                disabled={this.checkButtonDisabled(activeStep)}
                onClick={
                  activeStep === steps.length - 2
                    ? async () => {
                        this.handleNext();
                        await this.getAnnotations();
                      }
                    : this.handleNext
                }
                className={classes.button}
              >
                Next
              </Button>
            )}
          </Grid>
        </Grid>
      </>
    );
  }
}

export default withStyles(styles)(AnnotationCollection);

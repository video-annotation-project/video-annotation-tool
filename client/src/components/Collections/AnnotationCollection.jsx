import React, { Component } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import StepContent from "@material-ui/core/StepContent";
import Button from "@material-ui/core/Button";
import { Grid, Typography } from "@material-ui/core";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import Swal from "sweetalert2";

import VerifySelectUser from "../Utilities/SelectUser.jsx";
import VerifySelectVideo from "../Utilities/SelectVideo.jsx";
import VerifySelectConcept from "../Utilities/SelectConcept.jsx";

const styles = theme => ({
  list: {
    width: "100%",
    backgroundColor: theme.palette.background.paper
  },
  item: {
    display: "inline",
    paddingTop: 0,
    width: "1300px",
    height: "730px",
    paddingLeft: 0
  },
  img: {
    padding: theme.spacing(3),
    width: "1280px",
    height: "720px"
  },
  button: {
    marginTop: theme.spacing(3),
    marginRight: theme.spacing()
  },
  actionsContainer: {
    marginBottom: theme.spacing(2)
  },
  resetContainer: {
    padding: theme.spacing(3)
  },
  formControl: {
    minWidth: 200,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    marginLeft: theme.spacing()
  },
  collection: {
    marginTop: theme.spacing()
  },
  stepper: {
    display: "block",
    flex: 1,
    flexDirection: "column",
    justifyContent: "left",
    width: "70%"
  },
  models: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    justifyContent: "right",
    alignItems: "right",
    width: "30%"
  },
  container: {
    display: "flex",
    flexDirection: "row",
    padding: "20px",
    height: "560px"
  },
  stats1: {
    marginTop: theme.spacing(),
    marginLeft: theme.spacing(),
    marginRight: theme.spacing(4)
  },
  stats2: {
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginBottom: theme.spacing()
  }
});

function getSteps() {
  return ["Users", "Videos", "Concepts", "Insert"];
}

class AnnotationCollection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      /* -1 represents select all */
      selectedUsers: [],
      selectedCollection: "",
      selectedVideos: [],
      selectedConcepts: [],
      annotationCount: "",
      trackingCount: "",
      collections: [],
      includeTracking: false,
      error: null,
      activeStep: 0
    };
  }

  componentDidMount() {
    return this.loadCollections();
  }

  loadCollections = callback => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    return axios.get("/api/collections/annotations", config).then(res => {
      this.setState(
        {
          collections: res.data
        },
        callback
      );
    });
  };

  handleChangeCollection = event => {
    this.setState({
      selectedCollection: event.target.value
    });
  };

  createAnnotationCollection = () => {
    Swal.mixin({
      confirmButtonText: "Next",
      showCancelButton: true,
      progressSteps: ["1", "2"]
    })
      .queue([
        {
          title: "Collection Name",
          input: "text"
        },
        {
          title: "Description",
          input: "textarea"
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
              "Content-Type": "application/json",
              Authorization: "Bearer " + localStorage.getItem("token")
            }
          };
          try {
            await axios.post("/api/collections/annotations", body, config);
            Swal.fire({
              title: "Collection Created!",
              confirmButtonText: "Lovely!"
            });
            this.loadCollections();
          } catch (error) {
            Swal.fire("Error Creating Collection", "", "error");
          }
        }
      });
  };

  deleteAnnotationCollection = async () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async result => {
      if (result.value) {
        try {
          let response = await axios.delete(
            "/api/collections/annotations/" + this.state.selectedCollection,
            config
          );
          if (response.status === 200) {
            Swal.fire("Deleted!", "Collection has been deleted.", "success");
            this.loadCollections();
            this.setState({
              selectedCollection: ""
            });
          }
        } catch (error) {
          Swal.fire(error, "", "error");
        }
      }
    });
  };

  insertAnnotationsToCollection = () => {
    const config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    };
    const body = {
      selectedUsers: this.state.selectedUsers,
      selectedVideos: this.state.selectedVideos,
      selectedConcepts: this.state.selectedConcepts,
      includeTracking: this.state.includeTracking
    };
    try {
      axios
        .post(
          "/api/collections/annotations/" + this.state.selectedCollection,
          body,
          config
        )
        .then(res => {
          Swal.fire({
            title: "Inserted!",
            confirmButtonText: "Lovely!"
          });
          this.loadCollections();
        })
        .catch(error => {
          console.log(error);
          Swal.fire("Could not insert", "", "error");
        });
    } catch (error) {
      Swal.fire("Error inserting video", "", "error");
    }
  };

  getUsers = async () => {
    return axios
      .get(`/api/users?noAi=true`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      })
      .then(res => res.data)
      .catch(error => {
        console.log(error);
        this.setState({
          error: error
        });
      });
  };

  getVideos = async () => {
    return axios
      .get(`/api/annotations/verified`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        params: {
          verifiedOnly: "0",
          selectedUsers: this.state.selectedUsers
        }
      })
      .then(res => res.data)
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  getVideoCollections = async () => {
    return axios
      .get(`/api/collections/videos`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      })
      .then(res => res.data)
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  getConcepts = async () => {
    return axios
      .get(`/api/annotations/verified`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        params: {
          verifiedOnly: "0",
          selectedUsers: this.state.selectedUsers,
          selectedVideos: this.state.selectedVideos
        }
      })
      .then(res => res.data)
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  getConceptCollections = async () => {
    return axios
      .get(`/api/collections/concepts`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      })
      .then(res => res.data)
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  getAnnotations = async () => {
    return axios
      .get(`/api/annotations/collection/counts`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        params: {
          selectedUsers: this.state.selectedUsers,
          selectedVideos: this.state.selectedVideos,
          selectedConcepts: this.state.selectedConcepts
        }
      })
      .then(res => {
        this.setState({
          annotationCount: res.data[0].annotationcount,
          trackingCount: res.data[0].trackingcount
        });
      })
      .catch(error => {
        this.setState({
          error: error
        });
      });
  };

  selectUser = user => {
    this.setState({
      selectedUsers: this.state.selectedUsers.concat(user)
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

  handleChangeList = type => event => {
    if (!this.state[type].includes(event.target.value)) {
      if (event.target.value === "-1") {
        this.setState({
          [type]: ["-1"]
        });
      } else {
        if (this.state[type][0] === "-1") {
          this.setState({
            [type]: [event.target.value]
          });
        } else {
          this.setState({
            [type]: this.state[type].concat(event.target.value)
          });
        }
      }
    } else {
      this.setState({
        [type]: this.state[type].filter(typeid => typeid !== event.target.value)
      });
    }
  };

  resetStep = step => {
    switch (step) {
      case 0:
        this.setState({
          selectedUsers: []
        });
        return;
      case 1:
        this.setState({
          selectedVideos: []
        });
        return;
      case 2:
        this.setState({
          selectedConcepts: []
        });
        return;
      case 3:
        this.setState({
          includeTracking: false
        });
        return;
      default:
        return;
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

  showCollection = () => {
    let data = this.state.collections.find(col => {
      return col.id === this.state.selectedCollection;
    });
    if (data.concepts[0] && data.users[0]) {
      return (
        <React.Fragment>
          <Typography variant="subtitle1" className={this.props.classes.stats1}>
            Concepts ({data.concepts.length}):
          </Typography>
          <Typography variant="subtitle1" className={this.props.classes.stats2}>
            {data.concepts.join(", ")}
          </Typography>
          <Typography variant="subtitle1" className={this.props.classes.stats1}>
            Users ({data.users.length}):
          </Typography>
          <Typography variant="subtitle1" className={this.props.classes.stats2}>
            {data.users.join(", ")}
          </Typography>
        </React.Fragment>
      );
    }
  };

  getStepForm = step => {
    switch (step) {
      case 0:
        return (
          <VerifySelectUser
            value={this.state.selectedUsers}
            getUsers={this.getUsers}
            selectUser={this.selectUser}
            handleChangeList={this.handleChangeList("selectedUsers")}
          />
        );
      case 1:
        return (
          <VerifySelectVideo
            value={this.state.selectedVideos}
            getVideos={this.getVideos}
            getVideoCollections={this.getVideoCollections}
            handleChange={this.handleChange("selectedVideos")}
            handleChangeList={this.handleChangeList("selectedVideos")}
          />
        );
      case 2:
        return (
          <VerifySelectConcept
            value={this.state.selectedConcepts}
            getConcepts={this.getConcepts}
            getConceptCollections={this.getConceptCollections}
            handleChange={this.handleChange("selectedConcepts")}
            handleChangeList={this.handleChangeList("selectedConcepts")}
          />
        );
      case 3:
        return (
          <React.Fragment>
            <Typography>
              Number of Annotations: {this.state.annotationCount}
            </Typography>
            <Typography>
              Number of Tracking Annotations: {this.state.trackingCount}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={this.state.includeTracking}
                  onChange={this.handleChangeSwitch("includeTracking")}
                  value="includeTracking"
                  color="primary"
                  disabled={this.state.trackingCount === "0"}
                />
              }
              label="Include tracking annotations"
            />
          </React.Fragment>
        );
      default:
        return "Unknown step";
    }
  };

  checkButtonDisabled = step => {
    switch (step) {
      case 0:
        return this.state.selectedUsers.length === 0;
      case 1:
        return this.state.selectedVideos.length === 0;
      case 2:
        return this.state.selectedConcepts.length === 0;
      case 3:
        return this.state.selectedCollection === "";
      default:
        return false;
    }
  };

  handleNext = () => {
    this.setState(state => ({
      activeStep: state.activeStep + 1
    }));
  };

  handleBack = step => {
    this.resetStep(step);
    this.setState({
      activeStep: this.state.activeStep - 1
    });
  };

  render() {
    const { activeStep } = this.state;
    const { classes } = this.props;
    const steps = getSteps();

    return (
      <Grid container spacing={5}>
        <Grid item xs={6}>
          <div className={classes.container}>
            <Stepper
              activeStep={activeStep}
              orientation="vertical"
              className={classes.stepper}
            >
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                  <StepContent>
                    {this.getStepForm(index)}

                    <div className={classes.actionsContainer}>
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
                        ""
                      )}
                      {activeStep === steps.length - 1 ? (
                        <Button
                          variant="contained"
                          color="primary"
                          disabled={this.checkButtonDisabled(index)}
                          onClick={() =>
                            this.insertAnnotationsToCollection("annotations")
                          }
                          className={classes.button}
                        >
                          Add Annotations
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          disabled={this.checkButtonDisabled(index)}
                          onClick={
                            activeStep === steps.length - 2
                              ? async () => {
                                  await this.getAnnotations();
                                  this.handleNext();
                                }
                              : this.handleNext
                          }
                          className={classes.button}
                        >
                          Next
                        </Button>
                      )}
                    </div>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </div>
        </Grid>
        <Grid item xs={6} className={classes.collection}>
          <FormControl className={classes.formControl}>
            <InputLabel>Select collection</InputLabel>
            <Select
              value={this.state.selectedCollection}
              onChange={this.handleChangeCollection}
              autoWidth={true}
            >
              <MenuItem value="">Select collection</MenuItem>
              {this.state.collections.map(collection => {
                return (
                  <MenuItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </MenuItem>
                );
              })}
            </Select>
            {this.state.selectedCollection === "" ||
            !this.state.collections.filter(collection => {
              return collection.id === this.state.selectedCollection;
            })[0].description ? (
              ""
            ) : (
              <FormHelperText>
                {
                  this.state.collections.filter(collection => {
                    return collection.id === this.state.selectedCollection;
                  })[0].description
                }
              </FormHelperText>
            )}
          </FormControl>
          {this.state.selectedCollection ? this.showCollection() : ""}
          <div>
            <Button
              className={classes.button}
              disabled={this.state.selectedCollection === ""}
              onClick={this.deleteAnnotationCollection}
            >
              Delete This Collection
            </Button>
            <Button
              className={classes.button}
              onClick={this.createAnnotationCollection}
            >
              New Annotation Collection
            </Button>
          </div>
        </Grid>
      </Grid>
    );
  }
}

AnnotationCollection.propTypes = {
  classes: PropTypes.object
};

export default withStyles(styles)(AnnotationCollection);

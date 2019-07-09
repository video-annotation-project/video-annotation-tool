import React from "react";
import { Redirect, Route, Switch } from "react-router-dom";

import Annotate from "./components/Annotate/Annotate.jsx";
import Concepts from "./components/SelectConcepts/Concepts.jsx";
import CreateUser from "./components/CreateUser.jsx";
import Home from "./components/Home.jsx";
import Login from "./components/Login.jsx";
import Navbar from "./components/Navbar.jsx";
import Profile from "./components/Profile.jsx";
import Report from "./components/Report/Report.jsx";
import Verify from "./components/Verify/Verify.jsx";
import PreviousModels from "./components/Model/PreviousModels.jsx";
import Users from "./components/Users.jsx";
import AIvideos from "./components/AIVideos/AIvideos.jsx";

import ConceptCollection from "./components/Collections/ConceptCollection.jsx"
import VideoCollection from "./components/Collections/VideoCollection.jsx"

import CreateModel from "./components/Model/CreateModel.jsx";
import ViewModels from "./components/Model/ViewModels.jsx";
import PredictModel from "./components/Model/PredictModel.jsx";
import TrainModel from "./components/Model/TrainModel.jsx";

require("dotenv").config();

class App extends React.Component {
  render() {
    return (
      <React.Fragment>
        <Navbar />
        <Switch>
          <Route exact path="/" component={Home} />
          {localStorage.getItem("isAuthed") ? (
            <React.Fragment>
              {localStorage.getItem("admin") ? (
                <React.Fragment>
                  <Route exact path="/concepts" component={Concepts} />

                  <Route exact path="/report" component={Report} />
                  <Route exact path="/account/createUser" component={CreateUser} />
                  <Route exact path="/models/create" component={CreateModel} />
                  <Route exact path="/models/predict" component={PredictModel} />
                  <Route exact path="/models/train" component={TrainModel} />
                  <Route exact path="/models/view" component={ViewModels} />
                  <Route exact path="/models/runs" component={PreviousModels} />
                  <Route exact path="/users" component={Users} />
                  <Route exact path="/aivideos" component={AIvideos} />
                  <Route exact path="/conceptCollection" component={ConceptCollection} />
                  <Route exact path="/videoCollection" component={VideoCollection} />
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Route exact path="/concepts" component={Concepts} />
                  <Route exact path="/report" component={Report} />

                  <Route exact path="/ConceptCollection" component={ConceptCollection} />
                  <Route exact path="/VideoCollection" component={VideoCollection} />
                </React.Fragment>
              )}
              <Route exact path="/annotate/videos" component={Annotate} />
              <Route exact path="/annotate/verify" component={Verify} />
              <Route exact path="/account/profile" component={Profile} />
            </React.Fragment>
          ) : (
            <Route exact path="/login" component={Login} />
          )}
          <Route render={() => <Redirect to={"/"} />} />
        </Switch>
      </React.Fragment>
    );
  }
}

export default App;

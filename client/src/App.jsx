import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import Annotate from './components/Annotate';
import Concepts from './components/SelectConcepts/Concepts';
import CreateUser from './components/CreateUser';
import Home from './components/Home';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Profile from './components/Profile';
import Report from './components/Report/Report';
import Verify from './components/Verify/Verify';
import PreviousModels from './components/Model/PreviousModels';
import Users from './components/Users';
import AIvideos from './components/AIVideos/AIvideos';

import AnnotationCollection from './components/Collections/AnnotationCollection';
import ConceptCollection from './components/Collections/ConceptCollection';
import VideoCollection from './components/Collections/VideoCollection';

import CreateModel from './components/Model/CreateModel';
import ViewModels from './components/Model/ViewModels';
import PredictModel from './components/Model/PredictModel';
import TrainModel from './components/Model/TrainModel';

require('dotenv').config();

const App = () => {
  return (
    <React.Fragment>
      <Navbar />
      <Switch>
        <Route exact path="/" component={Home} />
        {localStorage.getItem('isAuthed') ? (
          <React.Fragment>
            {localStorage.getItem('admin') ? (
              <React.Fragment>
                <Route
                  exact
                  path="/account/createUser"
                  component={CreateUser}
                />
                <Route exact path="/models/create" component={CreateModel} />
                <Route exact path="/models/predict" component={PredictModel} />
                <Route exact path="/models/train" component={TrainModel} />
                <Route exact path="/models/view" component={ViewModels} />
                <Route exact path="/models/runs" component={PreviousModels} />
                <Route exact path="/users" component={Users} />
                <Route exact path="/aivideos" component={AIvideos} />
              </React.Fragment>
            ) : (
              ''
            )}
            <Route exact path="/concepts" component={Concepts} />
            <Route exact path="/report" component={Report} />
            <Route
              exact
              path="/collection/annotations"
              component={AnnotationCollection}
            />
            <Route
              exact
              path="/collection/concepts"
              component={ConceptCollection}
            />
            <Route
              exact
              path="/collection/videos"
              component={VideoCollection}
            />
            <Route exact path="/annotate/videos" component={Annotate} />
            <Route exact path="/annotate/verify" component={Verify} />
            <Route exact path="/account/profile" component={Profile} />
          </React.Fragment>
        ) : (
          <Route exact path="/login" component={Login} />
        )}
        <Route render={() => <Redirect to="/" />} />
      </Switch>
    </React.Fragment>
  );
};

export default App;

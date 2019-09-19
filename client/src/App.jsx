import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import '@sweetalert2/themes/dark';

import Annotate from './components/Annotate';
import Concepts from './components/SelectConcepts/Concepts';
import CreateUser from './components/CreateUser';
import Home from './components/Home';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Profile from './components/Profile';
import Report from './components/Report/Report';
import Verify from './components/Verify/Verify';
import Users from './components/Users';
import AIvideos from './components/AIVideos/AIvideos';

import AnnotationCollection from './components/Collections/AnnotationCollection';
import ConceptCollection from './components/Collections/ConceptCollection';
import VideoCollection from './components/Collections/VideoCollection';

import Models from './components/Model/Models';

require('dotenv').config();

const App = () => {
  return (
    <>
      <Navbar />
      <Switch>
        <Route exact path="/" component={Home} />
        {localStorage.getItem('isAuthed') ? (
          <>
            {localStorage.getItem('admin') ? (
              <>
                <Route exact path="/account/create" component={CreateUser} />
                <Route exact path="/models" component={Models} />
                <Route exact path="/users" component={Users} />
                <Route exact path="/aivideos" component={AIvideos} />
              </>
            ) : (
              ''
            )}
            <Route exact path="/concepts" component={Concepts} />
            <Route exact path="/report" component={Report} />
            <Route
              exact
              path="/collection/annotation"
              component={AnnotationCollection}
            />
            <Route
              exact
              path="/collection/concept"
              component={ConceptCollection}
            />
            <Route exact path="/collection/video" component={VideoCollection} />
            <Route exact path="/annotate/videos" component={Annotate} />
            <Route exact path="/annotate/verify" component={Verify} />
            <Route exact path="/account/profile" component={Profile} />
          </>
        ) : (
          <Route exact path="/login" component={Login} />
        )}
        <Route render={() => <Redirect to="/" />} />
      </Switch>
    </>
  );
};

export default App;

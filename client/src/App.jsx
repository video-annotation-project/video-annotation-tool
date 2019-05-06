import React from 'react';
import {
  Redirect,
  Route,
  Switch,
} from "react-router-dom";

import Annotate from './components/Annotate.jsx';
import Concepts from './components/Concepts.jsx';
import CreateUser from './components/CreateUser.jsx';
import Home from './components/Home.jsx';
import Login from './components/Login.jsx';
import Navbar from './components/Navbar.jsx';
import Profile from './components/Profile.jsx';
import Report from './components/Report.jsx';
import Models from './components/Models.jsx';

require('dotenv').config()

class App extends React.Component {

  render() {
    return (
      <React.Fragment>
        <Navbar />
        <Switch>
          <Route exact path='/' component={Home} />
          {localStorage.getItem('isAuthed') ? (
            <React.Fragment>
              {localStorage.getItem('admin') ? (
                  <React.Fragment>
                    <Route exact path='/concepts' component={Concepts} />
                    <Route exact path='/annotate' component={Annotate} />
                    <Route exact path='/report' component={Report} />
                    <Route exact path='/createUser' component={CreateUser} />
                    <Route exact path='/Models' component={Models} />
                  </React.Fragment>
              ):(
                <React.Fragment>
                  <Route exact path='/concepts' component={Concepts} />
                  <Route exact path='/annotate' component={Annotate} />
                  <Route exact path='/report' component={Report} />
                </React.Fragment>
              )}
              <Route exact path='/profile' component={Profile} />
            </React.Fragment>
          ) : (
            <Route exact path='/login' component={Login} />
          )}
          <Route render={() => <Redirect to={'/'} />} />
        </Switch>
      </React.Fragment>
    );
  }
}

export default App;

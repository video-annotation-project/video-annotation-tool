import React from 'react';
import {
  Redirect,
  Route,
  Switch,
} from "react-router-dom";

import Navbar from './components/Navbar.jsx';
import Home from './components/Home.jsx';
import Concepts from './components/Concepts.jsx';
import Annotate from './components/Annotate.jsx';
import Form from './components/Form.jsx';
import CreateUser from './components/CreateUser.jsx'
import Profile from './components/Profile.jsx'

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
                <Route exact path='/createUser' component={CreateUser} />
              ):(
                <React.Fragment>
                  <Route exact path='/concepts' component={Concepts} />
                  <Route exact path='/annotate' component={Annotate} />
                </React.Fragment>
              )}
              <Route exact path='/profile' component={Profile} />
            </React.Fragment>
          ) : (
            <Route exact path='/login' component={Form} />
          )}
          <Route render={() => <Redirect to={'/'} />} />
        </Switch>
      </React.Fragment>
    );
  }
}

/*
{localStorage.getItem('admin') === 'true' ? (
    <Button color='inherit' onClick={() => history.push('/createUser')}>
      Create User
    </Button>
):(
  <React.Fragment>
    <Button color='inherit' onClick={() => history.push('/concepts')}>
      Select Concepts
    </Button>
    <Button color='inherit' onClick={() => history.push('/annotate')}>
      Annotate Videos
    </Button>
  </React.Fragment>
)}
*/

export default App;

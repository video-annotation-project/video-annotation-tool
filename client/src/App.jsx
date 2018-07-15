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

class App extends React.Component {

  render() {
    return (
      <React.Fragment>
        <Route component={Navbar} />
        <Switch>
          <Route exact path='/' component={Home} />
          {localStorage.getItem('isAuthed') ? (
            <React.Fragment>
              <Route exact path='/concepts' component={Concepts} />
              <Route exact path='/annotate' component={Annotate} />
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

export default App;

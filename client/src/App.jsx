import React from 'react';
import {
  Route,
  Switch,
  Link,
  Redirect,
} from "react-router-dom";

import TestComponent from './components/TestComponent.jsx';
import Form from './components/Form.jsx'

const App = () => (
  <Switch>
    <Route path='/login' component={Form}/>
  </Switch>
);

export default App;

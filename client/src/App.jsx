import React from 'react';
import {
  Route,
  Link,
  Redirect,
} from "react-router-dom";

import TestComponent from './TestComponent.jsx';
import Form from './components/Form.jsx'

////////////////////////////////////////////////////////////
// 1. Click the public page
// 2. Click the protected page
// 3. Log in
// 4. Click the back button, note the URL each time

const App = () => (
  <Form />
);

export default App;

import React, { Component } from 'react';
import { Route, Link } from "react-router-dom";

import './App.css';
import logo from './logo.svg';
import TestComponent from './TestComponent.jsx';

class App extends Component {
  render() {
    return (
      <div className="App">

        <nav>
          <Link to="/" style={{marginRight: "20px"}}>Home</Link>
          <Link to="/testComponent">Test Component</Link>
        </nav>

        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.jsx</code> and save to reload.
        </p>

        <hr />

        <Route path="/testComponent" component={TestComponent} />
      </div>
    );
  }
}

export default App;

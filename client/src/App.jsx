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
import Models from "./components/Model/Models.jsx";
import Users from "./components/Users.jsx";
import AIvideos from "./components/AIVideos/AIvideos.jsx";

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
                  <Route exact path="/annotate" component={Annotate} />
                  <Route exact path="/report" component={Report} />
                  <Route exact path="/verify" component={Verify} />
                  <Route exact path="/createUser" component={CreateUser} />
                  <Route exact path="/models" component={Models} />
                  <Route exact path="/users" component={Users} />
                  <Route exact path="/aivideos" component={AIvideos} />
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Route exact path="/concepts" component={Concepts} />
                  <Route exact path="/annotate" component={Annotate} />
                  <Route exact path="/report" component={Report} />
                  <Route exact path="/verify" component={Verify} />
                </React.Fragment>
              )}
              <Route exact path="/profile" component={Profile} />
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

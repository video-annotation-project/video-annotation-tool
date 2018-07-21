import React, { Component } from 'react';
import ErrorModal from './ErrorModal.jsx';

class CreateUser extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      admin: false,
      errorMsg: null,
      open: false //modal code
    };
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  handleBoxChange = event => {
    this.setState({
      [event.target.name]: event.target.checked
    });
  }

  handleSubmit = event => {
    event.preventDefault();
    fetch('/createUser', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
      body: JSON.stringify({
        'username': this.state.username,
        'password': this.state.password,
        'admin': this.state.admin,
      })
    }).then(res => res.json()).then(res => {
      if (res.message === "user created") {
        alert("Created a new user: " + JSON.stringify(res.user))
        this.props.history.push('/');
      } else {
        this.setState({
          errorMsg: res.message,
          open: true
        });
      }
    })
  };

  //Code for closing modal
  handleClose = () => {
    this.setState({ open: false });
  };

  render() {
    return (
      <React.Fragment>
        <h2>Create a new user:</h2><br />
        <ErrorModal errorMsg={this.state.errorMsg} open={this.state.open} handleClose={this.handleClose}/>
        <form onSubmit={this.handleSubmit}>
          <div>username</div>
          <input type='text' name='username' value={this.state.username} onChange= {this.handleChange} required />
          <br /><br />
          <div>password</div>
          <input type='password' name='password' value={this.state.password} onChange= {this.handleChange} required />
          <br /><br />
          <input type="checkbox" name="admin" checked={this.state.admin} onChange= {this.handleBoxChange} />admin<br />
          <input type='submit' value='Create'/>
        </form>
      </React.Fragment>
    );
  }
}

export default CreateUser;

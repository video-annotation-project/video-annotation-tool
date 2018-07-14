import React, { Component } from 'react';

class Form extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }

  handleSubmit(event) {
    event.preventDefault();
    //Note: you can access FormData fields with 'data.get(fieldName)'
    fetch('/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        'username': this.state.username,
        'password': this.state.password
      })
    }).then(res => res.json()).then(res => {
      console.log(res);
      if (res.message === 'welcome') {
        console.log('welcome');
        // store res.token in localstorage
      } else {
        console.log('error');
      }
    });
  }

  render() {
    return (
      <div className='form'>
        <h2>Login</h2><br />
        <form onSubmit={this.handleSubmit}>
          <div>username</div><input type='text' name='username' value={this.state.username} onChange= {this.handleChange}/>
          <br /><br />
          <div>password</div><input type='password' name='password' value={this.state.password} onChange= {this.handleChange}/>
          <br /><br />
          <input type='submit' value='Login'/>
        </form>
      </div>
    );
  }
}

export default Form;

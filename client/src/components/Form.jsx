import React, { Component } from 'react';

class Form extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      errorMsg: null,
    };
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  handleSubmit = event => {
    event.preventDefault();
    fetch('/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        'username': this.state.username,
        'password': this.state.password
      })
    }).then(res => res.json()).then(res => {
      if (res.message === 'welcome') {
        localStorage.setItem('isAuthed', 'true');
        localStorage.setItem('token', res.token);
        this.props.history.push('/');
      } else {
        localStorage.clear();
        this.setState({
          errorMsg: res.message
        });
      }
    });
  };

  render() {
    return (
      <React.Fragment>
        <h2>Login</h2><br />
        <form onSubmit={this.handleSubmit}>
          <div>username</div>
          <input type='text' name='username' value={this.state.username} onChange= {this.handleChange}/>
          <br /><br />
          <div>password</div>
          <input type='password' name='password' value={this.state.password} onChange= {this.handleChange}/>
          <br /><br />
          <input type='submit' value='Login'/>
        </form>
        {this.state.errorMsg ? this.state.errorMsg : <div></div>}
      </React.Fragment>
    );
  }
}

export default Form;

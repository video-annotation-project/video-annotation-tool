import React, { Component } from 'react';

class Form extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userName: '',
      userPass: '',
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({[event.target.name]: event.target.value})
  }

  handleSubmit(event) {
    event.preventDefault();
    //Note: you can access FormData fields with 'data.get(fieldName)'
    fetch("/login", {
      method: 'POST',
      body: JSON.stringify({
        'userName': this.state.userName,
        'userPass': this.state.userPass
      }),
      headers: {"Content-Type": "application/json"}
    }).then(res => {
      console.log(res)
    })
  }
  
  render() {
    return (
      <div className="form">
        <h1>Login</h1><br />
        <div className='loadingBar'>
        {}
        </div>
        <form onSubmit={this.handleSubmit}>
        <div>User Name:</div><input type="text" name='userName' value={this.state.userName} onChange= {this.handleChange}/>
        <br /><br />
        <div>User Password:</div><input type="password" name='userPass' value={this.state.userPass} onChange= {this.handleChange}/>
        <br /><br />
        <input type="submit" value="Login"/>
        </form>
      </div>
    );
  }
}

export default Form;

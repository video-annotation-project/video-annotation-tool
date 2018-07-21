import React from 'react';

import ConceptsList from './ConceptsList.jsx';

class Concepts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      items: null
    };
  }

  componentDidMount() {
    fetch("/api/concepts", {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token')}
    })
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            isLoaded: true,
            item: result
          });
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          this.setState({
            isLoaded: true,
            error
          });
        }
      )
  }

  render() {
    const { error, isLoaded, item } = this.state;
    if (error) {
      return <div>Error: {error.message}</div>;
    }
    return (
      <React.Fragment>
        {isLoaded ? <div>{item}</div> : <div>Loading...</div>}
        <ConceptsList />
      </React.Fragment>
    );
  }
}

export default Concepts;

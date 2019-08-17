import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import App from './App';
import theme from './theme';

const darkTheme = createMuiTheme(theme);

ReactDOM.render(
  <ThemeProvider theme={darkTheme}>
    <React.Fragment>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.Fragment>
  </ThemeProvider>,
  document.getElementById('root')
);

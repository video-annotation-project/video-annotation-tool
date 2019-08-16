import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';
// import './index.css';
import App from './App';

const background = '#132232';
const primary = '#274769';
const secondary = '#1b324c';

const theme = createMuiTheme({
  palette: {
    background: {
      default: '#132232'
    }
  }
  // palette: {
  //   type: 'dark',
  //   primary: {
  //     text: 'white',
  //     main: background
  //   },
  //   secondary: {
  //     text: 'white',
  //     main: primary
  //   }
  // },
  // props: {
  //   MuiTable: {
  //     stripedRows: true
  //   },
  //   MuiTextField: {
  //     variant: 'filled'
  //   }
  // },
  // overrides: {
  //   // Style sheet name ⚛️
  //   MuiButton: {
  //     root: {
  //       color: secondary
  //     }
  //   },
  //   MuiTable: {
  //     root: {
  //       color: 'white',
  //       backgroundColor: background
  //     }
  //   },
  //   MuiTableRow: {
  //     root: {
  //       color: 'white'
  //     }
  //   },
  //   MuiTableCell: {
  //     root: {
  //       color: 'white',
  //       border: 'none'
  //     },
  //     head: {
  //       border: 'none'
  //     },
  //     body: {
  //       border: 'none'
  //     }
  //   },
  //   MuiPaper: {
  //     root: {
  //       backgroundColor: secondary
  //     }
  //   },
  //   MuiTypography: {
  //     colorTextPrimary: {
  //       color: 'white'
  //     },
  //     root: {
  //       color: 'white'
  //     }
  //   },
  //   MuiStepIcon: {
  //     root: {
  //       color: 'white'
  //     }
  //   },
  //   MuiStepLabel: {
  //     active: {
  //       color: 'white'
  //     },
  //     label: {
  //       color: 'white'
  //     }
  //   },
  //   MuiMenuItem: {
  //     gutters: {
  //       color: 'white'
  //     }
  //   },
  //   MuiButtonBase: {
  //     root: {
  //       color: primary
  //     }
  //   },
  //   MuiCheckbox: {
  //     colorSecondary: {
  //       Mui: {
  //         checked: {
  //           fill: 'white'
  //         }
  //       }
  //     }
  //   }
  // }
});

ReactDOM.render(
  <ThemeProvider theme={theme}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>,
  document.getElementById('root')
);

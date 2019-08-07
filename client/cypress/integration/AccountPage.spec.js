Cypress.Commands.add('login', () => {
  cy.request({
    method: 'POST',
    url: 'http://localhost:3000/api/users/login',
    body: {
      username: 'kls',
      password: '123'
    },
    headers: { 'Content-Type': 'application/json' }
  }).then(res => {
    window.localStorage.setItem('isAuthed', 'true');
    window.localStorage.setItem('userid', res.body.userid);
    window.localStorage.setItem('username', 'kls');
    window.localStorage.setItem('token', res.body.token);
    // Add code for isAdmin
    if (res.body.isAdmin) {
      window.localStorage.setItem('admin', res.body.isAdmin);
    }
  });
});

beforeEach(() => {
  cy.login();
});

describe('Account', () => {
  it('Login', () => {
    cy.visit('/');
    // cy.get('#navbar-login').click();
    // cy.get('#username').type('kls');
    // cy.get('#password').type('123');
    // cy.get('#login').click();

    Cypress.env('cookies').forEach(cookie => {
      cy.setCookie(cookie.name, cookie.value, cookie.options);
    });
  });

  it('Go to Account', () => {
    expect(localStorage.getItem('username')).to.eq('kls');
    cy.get('#navbar-account').click();
    cy.get('#navbar-profile').click();
    cy.get('form')
      .contains('Submit')
      .should('be.visible');
  });

  // it('new pw test', () => {
  //   cy.get('#current-pw').type('123');
  //   cy.get('#new-pw1').type('456');
  //   cy.get('#new-pw2').type('456');
  //   cy.get('#form-submit').click();
  // });

  //   it('change back to old pw', () => {
  //     cy.get('#current-pw').type('123');
  //     cy.get('#new-pw1').type(Cypress.env('password'));
  //     cy.get('#new-pw2').type(Cypress.env('password'));
  //     cy.get('#form-submit').click();
  //   });

  it('Logout', () => {
    cy.get('#navbar-logout').click();
    cy.contains('Login').should('be.visible');
  });
});

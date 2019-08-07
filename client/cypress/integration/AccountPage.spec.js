let password = '123';

Cypress.Commands.add('login', () => {
  cy.request({
    method: 'POST',
    url: 'http://localhost:3000/api/users/login',
    body: {
      username: 'test123',
      password
    },
    headers: { 'Content-Type': 'application/json' }
  }).then(res => {
    window.localStorage.setItem('isAuthed', 'true');
    window.localStorage.setItem('userid', res.body.userid);
    window.localStorage.setItem('username', 'test123');
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
  it('Go to Account', () => {
    Cypress.env('cookies').forEach(cookie => {
      cy.setCookie(cookie.name, cookie.value, cookie.options);
    });
    expect(localStorage.getItem('username')).to.eq('test123');
    cy.visit('/');
    cy.get('#navbar-account').click();
    cy.get('#navbar-profile').click();
    cy.get('form')
      .contains('Submit')
      .should('be.visible');
  });

  it('new pw test', () => {
    cy.get('#current-pw').type(password);
    cy.get('#new-pw1').type('456');
    cy.get('#new-pw2').type('456');
    cy.get('#form-submit').click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(4000);
    password = '456';
  });

  it('back to old pw', () => {
    cy.visit('/');
    cy.get('#navbar-account').click();
    cy.get('#navbar-profile').click();
    cy.get('form')
      .contains('Submit')
      .should('be.visible');
    cy.get('#current-pw').type(password);
    cy.get('#new-pw1').type('123');
    cy.get('#new-pw2').type('123');
    cy.get('#form-submit').click();
  });
});

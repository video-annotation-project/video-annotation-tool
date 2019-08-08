const password = '123';

Cypress.Commands.add('resetDb', () => {
  cy.request({
    method: 'PATCH',
    url: 'http://localhost:3000/api/users',
    body: {
      password: '456',
      newPassword1: '123',
      newPasswrod2: '123'
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
});

describe('Account', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Go to account page', () => {
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

  it('Change password', () => {
    cy.server();
    cy.route('PATCH', '/api/users').as('getUsers');
    cy.get('#current-pw').type(password);
    cy.get('#new-pw1').type('456');
    cy.get('#new-pw2').type('456');
    cy.get('#form-submit')
      .click()
      .then(() => {
        cy.wait('@getUsers');
        cy.resetDb();
      });
    cy.visit('/');
    cy.contains('Logout').click();
  });
});

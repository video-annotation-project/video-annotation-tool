Cypress.Commands.add('resetDb', () => {
  cy.request({
    method: 'PATCH',
    url: 'http://localhost:3000/api/users',
    body: {
      password: Cypress.env('test_new_password'),
      newPassword1: Cypress.env('test_password'),
      newPassword2: Cypress.env('test_password')
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
    expect(localStorage.getItem('username')).to.eq(
      Cypress.env('test_username')
    );
    cy.visit('/');
    cy.get('#navbar-account').click();
    cy.get('#navbar-profile').click();
    cy.get('form')
      .contains('Submit')
      .should('be.visible');
  });

  it('Change password', () => {
    cy.server();
    cy.route('PATCH', '/api/users').as('patchUsers');

    cy.get('#current-pw').type(Cypress.env('test_password'));
    cy.get('#new-pw1').type(Cypress.env('test_new_password'));
    cy.get('#new-pw2').type(Cypress.env('test_new_password'));
    cy.get('#form-submit')
      .click()
      .then(() => {
        cy.wait('@patchUsers');
        cy.resetDb();
      });
    cy.visit('/');
    cy.contains('Logout').click();
  });
});

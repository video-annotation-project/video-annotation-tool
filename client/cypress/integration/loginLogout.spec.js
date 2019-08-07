describe('LoginLogout', () => {
  it('Login', () => {
    cy.visit('/');
    cy.get('#navbar-login').click();
    cy.get('#username').type(Cypress.env('username'));
    cy.get('#password').type(Cypress.env('password'), { log: false });
    cy.get('#login').click();
  });

  it('Logout', () => {
    cy.get('#navbar-logout').click();
    cy.contains('Login').should('be.visible');
  });
});

describe('The Home Page', () => {
  it('Login', () => {
    cy.visit('/');
    cy.get('#navbar-login').click();
    cy.get('#username').type(Cypress.env('username'));
    cy.get('#password').type(Cypress.env('password'), { log: false });
    cy.get('#login').click();
  });

  it('Annotate Tab', () => {
    cy.get('#navbar-annotate').click();
    cy.get('#navbar-annotate-videos').click();
  });
});

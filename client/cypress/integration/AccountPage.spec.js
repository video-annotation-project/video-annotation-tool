describe('Account', () => {
  it('Login', () => {
    cy.visit('/');
    cy.get('#navbar-login').click();
    cy.get('#username').type(Cypress.env('username'));
    cy.get('#password').type(Cypress.env('password'), { log: false });
    cy.get('#login').click();

    Cypress.env('cookies').forEach(cookie => {
      cy.setCookie(cookie.name, cookie.value, cookie.options);
    });
  });

  it('Go to Account', () => {
    cy.get('#navbar-account').click();
    cy.get('#navbar-profile').click();
    cy.get('form')
      .contains('Submit')
      .should('be.visible');
  });

  //   it('new pw test', () => {
  //     cy.get('#current-pw').type(Cypress.env('password'));
  //     cy.get('#new-pw1').type('123');
  //     cy.get('#new-pw2').type('123');
  //     cy.get('#form-submit').click();
  //   });

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

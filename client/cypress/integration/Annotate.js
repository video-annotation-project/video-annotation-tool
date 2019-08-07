describe('Annotate', () => {
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

  it('Go to Annotate Tab', () => {
    cy.server();
    cy.route('GET', '/api/videos').as('getVideos');
    cy.get('#navbar-annotate').click();
    cy.get('#navbar-annotate-videos').click();
    cy.wait('@getVideos');
  });

  it('Draw box', () => {
    cy.get('#video')
      .trigger('mousedown', { clientX: 100, clientY: 100 })
      .trigger('mousemove', { clientX: 200, clientY: 200 })
      .trigger('mouseup');
  });

  it('Logout', () => {
    cy.get('#navbar-logout').click();
    cy.contains('Login').should('be.visible');
  });
});

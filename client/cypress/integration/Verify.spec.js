describe('Account', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Go to verify page', () => {
    cy.visit('/');
  });
});

describe('Account', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Go to verify page', () => {
    cy.visit('/');
    cy.contains('Annotate').click();
    cy.contains('Verify').click();
  });
});

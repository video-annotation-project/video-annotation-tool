describe('Report', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Go to report page', () => {
    expect(localStorage.getItem('username')).to.eq(
      Cypress.env('test_username')
    );
    cy.visit('/');
    cy.get('#navbar-report').click();
    cy.get('button')
      .contains('Ok')
      .should('be.visible');
  });

  it('Configure selector', () => {
    cy.get('button')
      .contains('Ok')
      .click();
    cy.get('#Level-1').select('Video');
    cy.get('#Level-2').select('Concept');
    cy.get('#ok-button').click();
  });

  it('Check my one annotation', () => {
    cy.contains('count:1')
      .should('be.visible')
      .click();
    cy.contains('longnose snailfish count:1')
      .should('be.visible')
      .click();
    cy.contains('Annotated: longnose snailfish').click();
  });

  it('Test with admin', () => {
    cy.visit('/');
    cy.contains('Logout').click();
    cy.login(Cypress.env('username'), Cypress.env('password')).then(() =>
      expect(localStorage.getItem('username')).to.eq('admin')
    );
    cy.visit('/');
    cy.get('#navbar-report').click();
    cy.get('button')
      .contains('Ok')
      .should('be.visible');
    cy.get('button')
      .contains('Ok')
      .click();
    cy.get('#Level-1').select('User');
    cy.get('#Level-2').select('Video');
    cy.get('#Level-3').select('Concept');
    cy.get('#ok-button').click();
    cy.contains(Cypress.env('test_username'))
      .should('be.visible')
      .click();
    cy.contains('.mp4 count:1')
      .should('be.visible')
      .click();
    cy.contains('longnose snailfish count:1')
      .should('be.visible')
      .click();
    cy.contains('Annotated: longnose snailfish').click();
  });
});

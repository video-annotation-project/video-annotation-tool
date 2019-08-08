describe('Annotate', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Go to annotate videos page', () => {
    expect(localStorage.getItem('username')).to.eq('test123');
    cy.visit('/');
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
});

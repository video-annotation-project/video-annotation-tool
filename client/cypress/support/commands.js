// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add('login', () => {
  cy.request({
    method: 'POST',
    url: 'http://localhost:3000/api/users/login',
    body: {
      username: 'test123',
      password: '123'
    },
    headers: { 'Content-Type': 'application/json' }
  }).then(res => {
    window.localStorage.setItem('isAuthed', 'true');
    window.localStorage.setItem('userid', res.body.userid);
    window.localStorage.setItem('username', 'test123');
    window.localStorage.setItem('token', res.body.token);
    // Add code for isAdmin
    if (res.body.isAdmin) {
      window.localStorage.setItem('admin', res.body.isAdmin);
    }
  });
});

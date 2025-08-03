/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to mock authentication
       */
      mockAuth(): Chainable<void>

      /**
       * Custom command to mock API responses
       */
      mockApiResponses(): Chainable<void>
    }
  }
}

Cypress.Commands.add("mockAuth", () => {
  // Mock localStorage flag (dacă mai e folosit)
  cy.window().then((win) => {
    win.localStorage.setItem("test-auth", "true")
  })

  // Mock răspunsul NextAuth pentru sesiune
  cy.intercept("GET", "/api/auth/session", {
    statusCode: 200,
    body: {
      user: {
        name: "Test User",
        email: "test@example.com",
        image: null,
        id: "test-user-id",
      },
      expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      accessToken: "mock-access-token",
    },
  }).as("getSession")
})


Cypress.Commands.add("mockApiResponses", () => {
  cy.intercept("GET", "/api/categories", { fixture: "categories.json" }).as("getCategories")
  cy.intercept("GET", "/api/emails*", { fixture: "emails.json" }).as("getEmails")
  cy.intercept("GET", "/api/accounts", { fixture: "accounts.json" }).as("getAccounts")
})

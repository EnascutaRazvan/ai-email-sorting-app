/// <reference types="cypress" />

import { cy } from "cypress"

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
  cy.window().then((win) => {
    win.localStorage.setItem("test-auth", "true")
  })
})

Cypress.Commands.add("mockApiResponses", () => {
  cy.intercept("GET", "/api/categories", { fixture: "categories.json" }).as("getCategories")
  cy.intercept("GET", "/api/emails*", { fixture: "emails.json" }).as("getEmails")
  cy.intercept("GET", "/api/accounts", { fixture: "accounts.json" }).as("getAccounts")
})

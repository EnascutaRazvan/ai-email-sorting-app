import { describe, beforeEach, it } from "cypress"
import { cy } from "cypress"

describe("Email Import Flow", () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem("test-auth", "true")
    })

    cy.intercept("GET", "/api/accounts", {
      fixture: "accounts.json",
    }).as("getAccounts")
  })

  it("should import emails successfully", () => {
    cy.visit("/dashboard")
    cy.wait("@getAccounts")

    // Mock import API
    cy.intercept("POST", "/api/emails/import", {
      statusCode: 200,
      body: {
        success: true,
        imported: 5,
        processed: 10,
        message: "Successfully imported 5 new emails",
      },
    }).as("importEmails")

    // Click import button
    cy.get('[data-testid="import-emails-button"]').click()

    // Select account
    cy.get('[data-testid="account-select"]').select("account-1")

    // Start import
    cy.get('[data-testid="start-import"]').click()

    cy.wait("@importEmails")

    // Verify success message
    cy.get('[data-testid="import-success"]').should("contain", "Successfully imported 5 new emails")
  })

  it("should handle import errors gracefully", () => {
    cy.visit("/dashboard")
    cy.wait("@getAccounts")

    // Mock import error
    cy.intercept("POST", "/api/emails/import", {
      statusCode: 500,
      body: { error: "Failed to import emails" },
    }).as("importEmailsError")

    cy.get('[data-testid="import-emails-button"]').click()
    cy.get('[data-testid="account-select"]').select("account-1")
    cy.get('[data-testid="start-import"]').click()

    cy.wait("@importEmailsError")

    // Verify error message
    cy.get('[data-testid="import-error"]').should("contain", "Failed to import emails")
  })
})

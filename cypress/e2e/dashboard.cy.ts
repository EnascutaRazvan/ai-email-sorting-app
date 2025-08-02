import { describe, beforeEach, it } from "cypress"
import { cy } from "cypress"

describe("Dashboard Flow", () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem("test-auth", "true")
    })

    // Intercept API calls
    cy.intercept("GET", "/api/categories", {
      fixture: "categories.json",
    }).as("getCategories")

    cy.intercept("GET", "/api/emails*", {
      fixture: "emails.json",
    }).as("getEmails")

    cy.intercept("GET", "/api/accounts", {
      fixture: "accounts.json",
    }).as("getAccounts")
  })

  it("should load dashboard with all components", () => {
    cy.visit("/dashboard")

    // Wait for API calls
    cy.wait(["@getCategories", "@getEmails", "@getAccounts"])

    // Check main components are present
    cy.get('[data-testid="email-list"]').should("be.visible")
    cy.get('[data-testid="categories-sidebar"]').should("be.visible")
    cy.get('[data-testid="email-filters"]').should("be.visible")
  })

  it("should filter emails by category", () => {
    cy.visit("/dashboard")
    cy.wait(["@getCategories", "@getEmails", "@getAccounts"])

    // Click on a category
    cy.get('[data-testid="category-item"]').first().click()

    // Verify API call with category filter
    cy.wait("@getEmails").its("request.url").should("include", "category=")
  })

  it("should open email detail dialog", () => {
    cy.visit("/dashboard")
    cy.wait(["@getCategories", "@getEmails", "@getAccounts"])

    // Mock email content API
    cy.intercept("GET", "/api/emails/*/content", {
      fixture: "email-content.json",
    }).as("getEmailContent")

    // Click on first email
    cy.get('[data-testid="email-item"]').first().click()

    // Verify dialog opens
    cy.get('[data-testid="email-detail-dialog"]').should("be.visible")
    cy.wait("@getEmailContent")
  })

  it("should create new category", () => {
    cy.visit("/dashboard")
    cy.wait(["@getCategories", "@getEmails", "@getAccounts"])

    // Mock create category API
    cy.intercept("POST", "/api/categories", {
      statusCode: 200,
      body: {
        category: {
          id: "new-category",
          name: "Test Category",
          color: "#3B82F6",
          email_count: 0,
        },
      },
    }).as("createCategory")

    // Open create category dialog
    cy.get('[data-testid="create-category-button"]').click()

    // Fill form
    cy.get('input[name="name"]').type("Test Category")
    cy.get('textarea[name="description"]').type("Test description")

    // Submit
    cy.get('button[type="submit"]').click()

    cy.wait("@createCategory")
  })

  it("should bulk delete emails", () => {
    cy.visit("/dashboard")
    cy.wait(["@getCategories", "@getEmails", "@getAccounts"])

    // Mock bulk delete API
    cy.intercept("POST", "/api/emails/bulk-delete", {
      statusCode: 200,
      body: { success: true, deletedCount: 2 },
    }).as("bulkDelete")

    // Select multiple emails
    cy.get('[data-testid="email-checkbox"]').first().check()
    cy.get('[data-testid="email-checkbox"]').eq(1).check()

    // Click bulk delete
    cy.get('[data-testid="bulk-delete-button"]').click()

    // Confirm deletion
    cy.get('[data-testid="confirm-delete"]').click()

    cy.wait("@bulkDelete")
  })
})

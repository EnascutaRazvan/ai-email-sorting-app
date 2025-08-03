/// <reference types="cypress" />

describe("Categories component", () => {
  beforeEach(() => {
    // Mock valid session to bypass login check
    cy.intercept("GET", "/api/auth/session", {
      statusCode: 200,
      body: {
        user: { id: "test-user-id", name: "Test User", email: "test@example.com" },
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    })

    // Intercept GET for categories with mock fixture
    cy.intercept("GET", "/api/categories", {
      statusCode: 200,
      body: {
        categories: [
          { id: "1", name: "Work", description: "Work emails", color: "#3B82F6", email_count: 5 },
          { id: "2", name: "Personal", description: "Personal emails", color: "#EF4444", email_count: 3 },
        ],
      },
    }).as("getCategories")

    // Visit page/component showing categories list
    cy.visit("/dashboard") // adjust route as per your setup
  })

  it("displays categories after loading", () => {
    cy.wait("@getCategories")

    cy.contains("Categories")
    cy.get("button").contains("Work").should("exist")
    cy.get("button").contains("Personal").should("exist")
  })
})

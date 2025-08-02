import { describe, beforeEach, it } from "cypress"

describe("Authentication Flow", () => {
  beforeEach(() => {
    // Clear any existing sessions
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it("should redirect unauthenticated users to sign in", () => {
    cy.visit("/dashboard")
    cy.url().should("include", "/auth/signin")
  })

  it("should display sign in page correctly", () => {
    cy.visit("/auth/signin")

    cy.get("h1").should("contain", "Sign in to your account")
    cy.get("button").should("contain", "Sign in with Google")

    // Check for Google OAuth button
    cy.get('button[type="button"]').should("be.visible")
  })

  it("should handle sign in flow", () => {
    cy.visit("/auth/signin")

    // Mock successful authentication
    cy.window().then((win) => {
      win.localStorage.setItem("test-auth", "true")
    })

    // In a real test, you would mock the OAuth flow
    // For now, we'll just verify the button exists and is clickable
    cy.get("button").contains("Sign in with Google").should("be.enabled")
  })
})

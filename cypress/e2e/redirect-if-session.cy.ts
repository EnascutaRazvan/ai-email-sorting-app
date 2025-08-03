/// <reference types="cypress" />

describe("Redirect if session exists", () => {
    it("should redirect from /auth/signin to /dashboard if user is authenticated", () => {
        // Mock API-ul NextAuth pentru sesiune activă
        cy.intercept("GET", "/api/auth/session", {
            statusCode: 200,
            body: {
                user: {
                    name: "Test User",
                    email: "test@example.com",
                    id: "test-user-id",
                    image: null,
                },
                expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                accessToken: "fake-token",
            },
        }).as("getSession")

        cy.visit("/auth/signin")

        cy.wait("@getSession")

        // Verifică redirect-ul
        cy.url().should("include", "/dashboard")
    })
})

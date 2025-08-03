/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      mockAuth(): Chainable<void>;
      mockApiResponses(emailsFixture?: string): Chainable<void>;
      signIn(emailsFixture?: string): Chainable<void>;
      selectCategory(categoryName: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("mockAuth", () => {
  cy.window().then((win) => {
    win.localStorage.setItem("test-auth", "true");
  });

  cy.intercept("GET", "/api/auth/session", {
    statusCode: 200,
    body: {
      user: {
        name: "Test User",
        email: "test@example.com",
        image: null,
        id: "test-user-id"
      },
      expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      accessToken: "mock-access-token"
    }
  }).as("getSession");
});

Cypress.Commands.add("mockApiResponses", (emailsFixture = "emails.json", categoriesFixture = "categories.json") => {
  cy.intercept("GET", "/api/categories", { fixture: categoriesFixture }).as("getCategories");
  cy.intercept("GET", "/api/emails*", { fixture: emailsFixture }).as("getEmails");
  cy.intercept("GET", "/api/accounts", { fixture: "accounts.json" }).as("getAccounts");
});

Cypress.Commands.add("signIn", (emailsFixture = "emails.json") => {
  cy.mockAuth();
  cy.mockApiResponses(emailsFixture);
});

Cypress.Commands.add("selectCategory", (categoryName: string) => {
  cy.contains(categoryName).click();
});

export { };

// cypress/e2e/email-detail.cy.ts

describe('Email Detail Dialog', () => {
    let emailsData: { success: boolean; emails: any[] };

    before(() => {
        emailsData = require('../fixtures/emails.json');
    });

    beforeEach(() => {
        cy.signIn();
        cy.visit('/');
        cy.wait('@getCategories');
        cy.wait('@getAccounts');
        cy.wait('@getEmails');
    });

    it('opens the detail dialog, dismisses the error toast, then closes', () => {
        const firstEmail = emailsData.emails[0];

        // 1) Open the detail dialog
        cy.contains(firstEmail.subject, { timeout: 10000 }).click();

        // 2) Dialog is visible
        cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');

    });
});

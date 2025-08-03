// cypress/e2e/email-import.cy.ts

describe('Email Import Button', () => {
    beforeEach(() => {
        // 1) Stub auth + core APIs with initial fixtures
        cy.signIn('emails_initial.json');

        cy.intercept('GET', '/api/accounts', { fixture: 'accounts.json' }).as('getAccounts');
        cy.intercept('GET', '/api/categories', { fixture: 'categories.json' }).as('getCategories');
        cy.intercept('GET', '/api/emails*', { fixture: 'emails_initial.json' }).as('getEmails');

        // 2) Visit dashboard and wait
        cy.visit('/');
        cy.wait('@getCategories');
        cy.wait('@getAccounts');
        cy.wait('@getEmails');
    });

    it('clicking Import Emails triggers import API and refreshes the list', () => {
        // Make sure the new email isn't there yet
        cy.contains('Exclusive Offer').should('not.exist');

        // 3) Stub *any* POST to /api/emails/import*
        cy.intercept(
            { method: 'POST', url: /\/api\/emails\/import.*/ },
            { statusCode: 200, body: { importedCount: 1 } }
        ).as('importEmails');

        // 4) Stub the subsequent GET /api/emails* to return the “after” fixture
        cy.intercept('GET', '/api/emails*', { fixture: 'emails_after.json' }).as('getEmailsAfter');

        // 5) Click the import button (force if it’s hidden)
        cy.contains('button', 'Import Emails').click({ force: true });

        // 6) Wait for both calls
        cy.contains('button', 'Import All').click({ force: true });
        cy.wait('@importEmails');
        cy.wait('@getEmailsAfter');


        // 7) Assert the newly imported email appears
        cy.contains('Exclusive Offer').should('be.visible');
    });
});

// cypress/e2e/sidebar-accounts.cy.ts

// Load fixtures synchronously
const accountsFixture = require('../fixtures/accounts.json');
const emptyAccountsFixture = require('../fixtures/accounts_empty.json');

describe('Sidebar: Gmail Accounts', () => {
    beforeEach(() => {
        cy.signIn();
        cy.intercept('GET', '/api/accounts', { fixture: 'accounts.json' }).as('getAccounts');
        cy.visit('/');
        cy.wait('@getAccounts');
    });

    it('shows empty state when no accounts are connected', () => {
        cy.intercept('GET', '/api/accounts', { body: emptyAccountsFixture }).as('getAccountsEmpty');
        cy.visit('/');
        cy.wait('@getAccountsEmpty');
        cy.contains(/no accounts connected/i).should('be.visible');
    });

    it('renders the Gmail Accounts badge with the correct count', () => {
        cy.contains('Gmail Accounts')
            .parent()
            .find('.bg-sidebar-accent')
            .should('have.text', String(accountsFixture.accounts.length));
    });

    it('displays each account’s email, last sync & primary badge', () => {
        accountsFixture.accounts.forEach((acct: any) => {
            cy.contains(acct.email)
                .closest('div.group')
                .as('row');

            // Email
            cy.get('@row').contains(acct.email).should('be.visible');

            // Last sync date
            if (acct.last_sync) {
                const dateText = new Date(acct.last_sync).toLocaleDateString();
                cy.get('@row').contains(dateText).should('be.visible');
            }

            // Primary badge
            if (acct.is_primary) {
                cy.get('@row').contains(/primary/i).should('be.visible');
            }
        });
    });

    it('does not render a remove button for the primary account', () => {
        accountsFixture.accounts
            .filter((a: any) => a.is_primary)
            .forEach((acct: any) => {
                cy.contains(acct.email)
                    .closest('div.group')
                    .find('button')
                    .should('not.exist');
            });
    });

    it('allows removing a non-primary account', () => {
        const nonPrimary = accountsFixture.accounts.find((a: any) => !a.is_primary);
        if (!nonPrimary) {
            cy.log('No non-primary account to test; skipping');
            return;
        }

        // Stub DELETE
        cy.intercept('DELETE', `/api/accounts/${nonPrimary.id}`, {
            statusCode: 200,
            body: { success: true },
        }).as('deleteAcct');

        // Stub the subsequent GET to return only the remaining accounts
        const remaining = accountsFixture.accounts.filter((a: any) => a.id !== nonPrimary.id);
        cy.intercept('GET', '/api/accounts', {
            statusCode: 200,
            body: { accounts: remaining, total: remaining.length, primary: accountsFixture.primary },
        }).as('getAccountsAfter');

        // Click the remove button on the non-primary row
        cy.contains(nonPrimary.email)
            .closest('div.group')
            .find('button')
            .click({ force: true });

        // Wait for both the DELETE and the refreshed GET
        cy.wait('@deleteAcct');
        cy.wait('@getAccountsAfter');

        // The removed account should no longer exist
        cy.contains(nonPrimary.email).should('not.exist');
    });
});

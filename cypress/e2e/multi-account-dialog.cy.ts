// cypress/e2e/multi-account-dialog.cy.ts

// Load a fixture with two accounts so we can test the "2 Accounts Connected" banner
const accountsFixture = require('../fixtures/accounts.json');

describe('MultiAccountDialog (Connect Gmail)', () => {
    beforeEach(() => {
        // Stub auth/session & categories/emails as usual
        cy.signIn();

        // Stub GET /api/accounts to return two connected accounts
        cy.intercept('GET', '/api/accounts', {
            statusCode: 200,
            body: accountsFixture,
        }).as('getAccounts');

        // Visit the dashboard (sidebar with Connect button lives here)
        cy.visit('/');
        cy.wait('@getAccounts');

        // Spy on window.open so we can verify the OAuth popup URL
        cy.window().then((win) => {
            cy.spy(win, 'open').as('windowOpen');
        });

        // Stub the fetch for /api/auth/connect-account
        cy.intercept('GET', '/api/auth/connect-account', {
            statusCode: 200,
            body: { authUrl: 'https://oauth.example.com/google' },
        }).as('getAuthUrl');
    });

    it('opens the dialog when clicking the trigger', () => {
        // The trigger button in the sidebar
        cy.contains('Connect Gmail Account').should('exist').click();
        // Now the DialogContent header should appear
        cy.contains('Connect Gmail Account').should('be.visible');
        cy.contains('Connect your Gmail account to start organizing emails').should('be.visible');
    });

    it('shows the existing-accounts banner with correct pluralization', () => {
        // Open the dialog
        cy.contains('Connect Gmail Account').click();

        // With fixture of length 2, banner should read “2 Accounts Connected”
        cy.contains(/^2 Accounts Connected$/).should('be.visible');
    });

    it('launches the Google OAuth popup when "Connect with Google" is clicked', () => {
        // Open the dialog
        cy.contains('Connect Gmail Account').click();

        // Click the connect button
        cy.contains('Connect with Google').should('be.visible').click();

        // Wait for your auth-url fetch
        cy.wait('@getAuthUrl');

        // Assert window.open was called with the stubbed URL and correct window features
        cy.get('@windowOpen').should(
            'be.calledWith',
            'https://oauth.example.com/google',
            'connect-gmail',
            'width=500,height=600,scrollbars=yes,resizable=yes'
        );
    });

    it('displays help text under the connect button', () => {
        // Open the dialog
        cy.contains('Connect Gmail Account').click();

        cy.contains(
            /A popup window will open to authenticate with Google\. Please allow popups for this site\./
        ).should('be.visible');
    });
});

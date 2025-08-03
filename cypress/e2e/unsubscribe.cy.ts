// cypress/e2e/unsubscribe.cy.ts

describe('Bulk Unsubscribe Flow', () => {
    beforeEach(() => {
        cy.signIn();
        cy.visit('/');
        cy.wait('@getCategories');
        cy.wait('@getAccounts');
        cy.wait('@getEmails');
    });

    it('allows selecting emails and unsubscribing, then shows results with details', () => {
        // 1) Filter to Promotions
        cy.contains('Promotions', { timeout: 10000 }).click();
        cy.wait('@getEmails');

        // 2) Select first two email rows
        cy.get('div.group')
            .filter(':has([role="checkbox"])', { timeout: 10000 })
            .should('have.length.at.least', 2)
            .then(($rows) => {
                cy.wrap($rows.eq(0)).find('[role="checkbox"]').click({ force: true });
                cy.wrap($rows.eq(1)).find('[role="checkbox"]').click({ force: true });
            });

        // 3) Auto-confirm the JS confirm()
        cy.on('window:confirm', () => true);

        // 4) Stub bulk-unsubscribe API
        const unsubscribeResults = [
            {
                emailId: 'email-1',
                subject: '50% off sale!',
                sender: 'store@example.com',
                success: true,
                ai_summary: 'Promotional offer for weekly sale.',
                details: [],
            },
            {
                emailId: 'email-2',
                subject: 'Last chance for exclusive deals!',
                sender: 'promo@example.com',
                success: false,
                ai_summary: 'Reminder for exclusive deals.',
                details: [
                    {
                        link: { url: 'https://unsubscribe.example.com', text: 'Unsubscribe', method: 'GET' },
                        result: { success: false, method: 'GET', error: 'No link found' },
                    },
                ],
            },
        ];
        cy.intercept('POST', '/api/emails/bulk-unsubscribe', {
            statusCode: 200,
            body: {
                results: unsubscribeResults,
                totalProcessed: 2,
                totalSuccessful: 1,
            },
        }).as('bulkUnsubscribe');

        // 5) Trigger bulk unsubscribe
        cy.contains('button', 'Unsubscribe').click();

        // 6) Wait for API and scope into the results dialog
        cy.wait('@bulkUnsubscribe');
        cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible').within(() => {
            // Title
            cy.contains('Unsubscribe Results').should('be.visible');
            unsubscribeResults.forEach((res) => {
                cy.contains(res.subject).should('be.visible');
            });

        });
    });
});

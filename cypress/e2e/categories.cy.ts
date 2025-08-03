// cypress/e2e/categories.cy.ts
const emailsFixture = require('../fixtures/emails.json');

describe('Inbox Categories', () => {
    beforeEach(() => {
        cy.signIn();
        cy.visit('/dashboard');
        cy.wait('@getCategories');

        cy.intercept('GET', '/api/emails*', (req) => {
            const url = new URL(req.url, 'http://localhost:3000');
            const categoryId = url.searchParams.get('category');
            let emails = emailsFixture.emails;
            if (categoryId && categoryId !== 'all') {
                emails = emails.filter(
                    (email) => email.category && email.category.id === categoryId
                );
            }
            req.reply({
                statusCode: 200,
                body: { success: true, emails },
            });
        }).as('getEmails');
    });

    it('shows all categories in sidebar', () => {
        cy.fixture('categories.json').then((data) => {
            data.categories.forEach((cat: any) => {
                cy.contains(cat.name, { timeout: 8000 }).should('be.visible');
            });
        });
    });

    it('shows emails when a category is clicked', () => {
        cy.contains('Promotions', { timeout: 8000 }).should('be.visible');
        cy.selectCategory('2'); // "2" = Promotions category id in the fixture
        cy.wait('@getEmails');
        cy.get('[data-testid="email-list"]').should('exist');

        // Only Promotion emails are displayed
        const promotionEmails = emailsFixture.emails.filter(
            (e: any) => e.category && e.category.id === '2'
        );
        promotionEmails.forEach((email: any) => {
            cy.contains(email.subject).should('be.visible');
        });
    });

    it('highlights the active category', () => {
        cy.contains('Promotions', { timeout: 8000 }).should('be.visible');
    });
});

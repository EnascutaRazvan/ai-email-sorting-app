

describe('API endpoints (E2E)', () => {
    const base = '/api'

    it('GET /accounts → 200 & array', () => {
        cy.request(`${base}/accounts`).its('body.accounts').should('be.an', 'array')
    })

    it('POST /auth/connect-account → 200 & url', () => {
        cy.request('POST', `${base}/auth/connect-account`).then((res) => {
            expect(res.status).to.equal(200)
            expect(res.body).to.have.property('url')
        })
    })

    it('GET /auth/connect-callback → 200', () => {
        cy.request(`${base}/auth/connect-callback`).its('status').should('equal', 200)
    })

    it('GET /categories → categories array', () => {
        cy.request(`${base}/categories`).its('body.categories').should('be.an', 'array')
    })

    it('POST /categories → 201', () => {
        cy.request('POST', `${base}/categories`, { name: 'Cypress', color: '#123456' })
            .its('status')
            .should('equal', 201)
    })

    it('POST /categories/ensure-uncategorized → 200', () => {
        cy.request('POST', `${base}/categories/ensure-uncategorized`).its('status').should('equal', 200)
    })

    it('GET /cron/sync-emails → 200', () => {
        cy.request(`${base}/cron/sync-emails`).its('status').should('equal', 200)
    })

    it('GET /emails → emails array', () => {
        cy.request(`${base}/emails`).its('body.emails').should('be.an', 'array')
    })

    it('POST /emails → 200 or 201', () => {
        cy.request({
            method: 'POST',
            url: `${base}/emails`,
            body: { html: '<p>cypress</p>' },
            failOnStatusCode: false,
        }).then((res) => {
            expect([200, 201]).to.include(res.status)
        })
    })

    it('GET /emails/:id/content → 200', () => {
        cy.request({ url: `${base}/emails/fake-id/content`, failOnStatusCode: false })
            .its('status')
            .should('equal', 200)
    })

    it('POST /emails/bulk-delete → 200', () => {
        cy.request('POST', `${base}/emails/bulk-delete`, { ids: ['1', '2'] }).its('status').should('equal', 200)
    })

    it('POST /emails/bulk-unsubscribe → 200', () => {
        cy.request('POST', `${base}/emails/bulk-unsubscribe`, { ids: ['1', '2'] }).its('status').should('equal', 200)
    })

    it('POST /emails/import → 200', () => {
        cy.request('POST', `${base}/emails/import`, { email: 'a@b.com', token: 'tok' })
            .its('status')
            .should('equal', 200)
    })

    it('POST /emails/recategorize → 200', () => {
        cy.request('POST', `${base}/emails/recategorize`, { emailIds: ['x'] }).its('status').should('equal', 200)
    })

    it('POST /emails/sync-all → 200', () => {
        cy.request('POST', `${base}/emails/sync-all`).its('status').should('equal', 200)
    })
})

describe("SignIn Page", () => {
    beforeEach(() => {
        cy.visit("/auth/signin") // asumi că e ruta semnată pentru login
    })

    it("should render the sign in page correctly", () => {
        cy.contains("AI Email Sorting")
        cy.contains("Automatically categorize and manage your emails with AI")
        cy.get("button").should("contain", "Continue with Google")
        cy.get("svg").should("exist") // Google logo
    })

    it("should trigger signIn when clicking the button", () => {
        cy.window().then((win) => {
            cy.stub(win, "open") // prevent navigation for now
        })

        cy.get("button").click()
        cy.contains("Signing in...") // loading state
    })
})

import { test, expect } from "@playwright/test"

test.describe("Authentication Flow", () => {
  test("should allow a user to navigate to the sign-in page", async ({ page }) => {
    // Start from the home page
    await page.goto("/")

    // The home page should contain a "Sign In" button.
    const signInButton = page.getByRole("button", { name: /sign in/i })
    await expect(signInButton).toBeVisible()

    // Click the sign-in button
    await signInButton.click()

    // The user should be redirected to the sign-in page
    await page.waitForURL("**/auth/signin")
    await expect(page).toHaveURL(/.*signin/)

    // The sign-in page should have a "Sign in with Google" button
    const googleSignInButton = page.getByRole("button", { name: /sign in with google/i })
    await expect(googleSignInButton).toBeVisible()
  })
})

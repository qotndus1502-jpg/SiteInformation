import { expect, test } from "@playwright/test";

/** Smoke test for /login.
 *
 *  Requires only the frontend dev server — no backend, no Supabase. If this
 *  fails, the build is broken or the proxy is redirecting unexpectedly. */
test.describe("/login (public)", () => {
  test("renders the email + password fields", async ({ page }) => {
    await page.goto("/login");

    // The login page should reach `load` without redirecting away. If the
    // proxy thinks we're authenticated and bounces us to /statistics, this
    // assertion fails fast.
    await expect(page).toHaveURL(/\/login(\?|$)/);

    // Anchor on the form input ids — `getByLabel` matches the eye-icon's
    // aria-label too, which makes the assertion ambiguous.
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("submitting empty form does not crash", async ({ page }) => {
    await page.goto("/login");

    const submit = page.getByRole("button", { name: /로그인|login/i });
    await submit.click();

    // We don't assert a specific error text — just that we didn't navigate
    // away and the page is still alive.
    await expect(page).toHaveURL(/\/login/);
  });
});

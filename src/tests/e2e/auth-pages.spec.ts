import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Pages d'authentification", () => {
  test("la page /login s'affiche et n'a pas de violations a11y critiques", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /connexion|se connecter/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(critical).toEqual([]);
  });

  test("la page /register valide un username trop court côté client", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/nom d.?utilisateur/i).fill("ab");
    await page.getByLabel(/nom de la ferme/i).fill("Test");
    await page.getByLabel(/^mot de passe/i).fill("Password1");
    await page.getByRole("button", { name: /cr[ée]er/i }).click();

    await expect(page.getByText(/au moins 3|3 caract/i)).toBeVisible();
  });
});

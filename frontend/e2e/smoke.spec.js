import { expect, test } from "./support/fixtures";

test.describe("public pages", () => {
  test("hotel home shows branding, search form and properties", async ({ page }) => {
    await page.goto("/sunrise");
    await expect(page.getByRole("heading", { level: 1, name: "Sunrise Hostel" })).toBeVisible();
    await expect(page.getByText("Comfortable beds, friendly people")).toBeVisible();
    await expect(page).toHaveTitle("Sunrise Hostel");
    await expect(page.getByRole("heading", { name: "Our properties" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sunrise Central" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sunrise Lake" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "About Sunrise Hostel" })).toBeVisible();
    await expect(page.getByRole("link", { name: "hello@sunrise.test" })).toBeVisible();
  });

  test("every API request is scoped to the hotel via X-Tenant-Slug", async ({ page, backend }) => {
    await page.goto("/sunrise");
    await expect(page.getByRole("heading", { name: "Sunrise Central" })).toBeVisible();
    expect(backend.requests.length).toBeGreaterThan(0);
    for (const request of backend.requests) expect(request.headers["x-tenant-slug"]).toBe("sunrise");
  });

  test("hotel home with no properties shows an empty message", async ({ page, backend }) => {
    backend.properties = [];
    await page.goto("/sunrise");
    await expect(page.getByText("We're getting our rooms ready")).toBeVisible();
  });

  test("hotel search form leads to the property list with the chosen dates", async ({ page }) => {
    await page.goto("/sunrise");
    await page.getByRole("button", { name: "Find a bed" }).click();
    await expect(page).toHaveURL(/\/sunrise\/properties\?checkIn=\d{4}-\d{2}-\d{2}&checkOut=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole("heading", { name: "Find your next stay" })).toBeVisible();
  });

  test("an unknown hotel shows 'Hotel not found'", async ({ page, backend }) => {
    backend.tenantMode = "missing";
    await page.goto("/no-such-hotel");
    await expect(page.getByRole("heading", { name: "Hotel not found" })).toBeVisible();
    await expect(page.getByText("/no-such-hotel")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to ROOST" })).toHaveAttribute("href", "/");
  });

  test("a suspended hotel shows 'unavailable'", async ({ page, backend }) => {
    backend.tenantMode = "suspended";
    await page.goto("/sunrise");
    await expect(page.getByRole("heading", { name: "This hotel is unavailable" })).toBeVisible();
  });

  test("platform landing page links to the admin sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Bed & room booking/ })).toBeVisible();
    await page.getByRole("link", { name: "Platform admin sign in" }).click();
    await expect(page).toHaveURL("/platform/login");
    await expect(page.getByRole("heading", { name: "Platform admin" })).toBeVisible();
  });

  test("contact page uses the hotel's contact details", async ({ page }) => {
    await page.goto("/sunrise/contact");
    await expect(page.getByRole("heading", { name: /We'd love to hear from you/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "hello@sunrise.test" })).toHaveAttribute("href", "mailto:hello@sunrise.test");
    await expect(page.getByRole("link", { name: "9876543210" })).toHaveAttribute("href", "tel:9876543210");
  });

  test("gallery page renders and the category filter responds", async ({ page }) => {
    await page.goto("/sunrise/gallery");
    await expect(page.getByRole("heading", { name: "Photo Gallery" })).toBeVisible();
    const filters = page.locator("div.sticky button");
    expect(await filters.count()).toBeGreaterThan(1);
    await filters.nth(1).click();
    await expect(filters.nth(1)).toHaveClass(/bg-amber-600/);
  });

  test("unknown routes inside a hotel show the 404 page", async ({ page }) => {
    await page.goto("/sunrise/definitely/not/a/page");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL("/sunrise");
  });

  test("unknown platform routes redirect to the landing page", async ({ page }) => {
    await page.goto("/platform/whatever");
    await expect(page).toHaveURL("/");
  });

  test("legacy shortcut routes redirect to property search", async ({ page }) => {
    await page.goto("/sunrise/rooms");
    await expect(page).toHaveURL("/sunrise/properties");
  });

  test("navbar links work", async ({ page }, testInfo) => {
    await page.goto("/sunrise");
    if (testInfo.project.name === "mobile") await page.locator("nav button").last().click();
    await page.getByRole("link", { name: "Contact", exact: true }).first().click();
    await expect(page).toHaveURL("/sunrise/contact");
  });
});

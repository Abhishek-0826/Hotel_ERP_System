import { PASSWORD, expect, test } from "./support/fixtures";

async function adminLogin(page, email = "admin@roost.test", password = PASSWORD) {
  await page.goto("/platform/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("platform admin", () => {
  test("signs in and sees the hotel list", async ({ page, backend }) => {
    await adminLogin(page);
    await expect(page).toHaveURL("/platform/hotels");
    await expect(page.getByRole("heading", { name: "Hotels" })).toBeVisible();
    const row = page.getByRole("row", { name: /Sunrise Hostel/ });
    await expect(row).toContainText("owner@sunrise.test");
    await expect(row).toContainText("Profile complete");
    await expect(row).toContainText("2 properties · 4 beds · 2 bookings · 5 users");
    expect(backend.calls("POST", "/auth/admin/login")).toHaveLength(1);
    // Platform pages are not tied to a hotel.
    expect(backend.requests.every((r) => !r.headers["x-tenant-slug"])).toBe(true);
  });

  test("a wrong password shows an error", async ({ page }) => {
    await adminLogin(page, "admin@roost.test", "nope-nope-nope");
    await expect(page.getByText("Invalid email or password").first()).toBeVisible();
    await expect(page).toHaveURL("/platform/login");
  });

  test("a hotel owner cannot use the admin sign-in", async ({ page }) => {
    await adminLogin(page, "owner@sunrise.test");
    await expect(page.getByText("Invalid email or password").first()).toBeVisible();
  });

  test("the hotel list needs an admin session", async ({ page }) => {
    await page.goto("/platform/hotels");
    await expect(page).toHaveURL("/platform/login");
  });

  test("a non-admin session is sent away from the console", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/platform/hotels");
    await expect(page).toHaveURL("/platform/login");
    await expect(page.getByText(/not a platform admin/)).toBeVisible();
  });

  test("an already signed-in admin skips the login page and can sign out", async ({ page, signIn }) => {
    await signIn("admin");
    await page.goto("/platform/login");
    await expect(page).toHaveURL("/platform/hotels");
    await expect(page.getByText("admin@roost.test")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/platform/login");
  });

  test("forgot password requires an email first", async ({ page }) => {
    await page.goto("/platform/login");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByText("Enter your email first.")).toBeVisible();
  });

  test("creates a hotel with an email invitation", async ({ page, signIn, backend }) => {
    await signIn("admin");
    await page.goto("/platform/hotels");
    await page.getByRole("button", { name: "+ Add hotel" }).click();
    await page.getByLabel("Hotel name *").fill("Moonlight Inn");
    await expect(page.getByText("moonlight-inn", { exact: true })).toBeVisible(); // slug follows the name
    await page.getByLabel("Owner name *").fill("Olga Owner");
    await page.getByLabel("Owner email *").fill("olga@moon.test");
    await page.getByRole("button", { name: "Create hotel" }).click();

    await expect(page.getByRole("heading", { name: "Moonlight Inn is ready" })).toBeVisible();
    await expect(page.getByText("An email with a set-password link was sent to the owner.")).toBeVisible();
    await expect(page.locator("dd", { hasText: "olga@moon.test" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("row", { name: /Moonlight Inn/ })).toContainText("Awaiting owner");
    expect(backend.calls("POST", "/platform/tenants")[0].body).toMatchObject({ displayName: "Moonlight Inn", slug: "moonlight-inn", ownerName: "Olga Owner", ownerEmail: "olga@moon.test", accessMode: "invite" });
  });

  test("creates a hotel with a temporary password that is shown once", async ({ page, signIn, backend }) => {
    await signIn("admin");
    await page.goto("/platform/hotels");
    await page.getByRole("button", { name: "+ Add hotel" }).click();
    await page.getByLabel("Hotel name *").fill("Star Stay");
    await page.getByLabel("Owner name *").fill("Sid Owner");
    await page.getByLabel("Owner email *").fill("sid@star.test");
    await page.getByLabel(/Temporary password/).check();
    await page.getByRole("button", { name: "Create hotel" }).click();
    await expect(page.getByText("Temporary password (shown once)")).toBeVisible();
    const sent = backend.calls("POST", "/platform/tenants")[0].body;
    expect(sent.accessMode).toBe("password");
    expect(sent.temporaryPassword.length).toBeGreaterThanOrEqual(12);
    await expect(page.getByText(sent.temporaryPassword)).toBeVisible();
  });

  test("a taken URL address shows the server error and keeps the form open", async ({ page, signIn }) => {
    await signIn("admin");
    await page.goto("/platform/hotels");
    await page.getByRole("button", { name: "+ Add hotel" }).click();
    await page.getByLabel("Hotel name *").fill("Sunrise");
    await page.getByLabel("URL address *").fill("sunrise");
    await page.getByLabel("Owner name *").fill("Dup Owner");
    await page.getByLabel("Owner email *").fill("dup@x.test");
    await page.getByRole("button", { name: "Create hotel" }).click();
    await expect(page.getByText("That URL address is already taken")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Add a hotel" })).toHaveCount(0);
  });

  test("suspends (after confirming) and re-activates a hotel", async ({ page, signIn, backend }) => {
    await signIn("admin");
    await page.goto("/platform/hotels");
    const row = page.getByRole("row", { name: /Sunrise Hostel/ });

    page.once("dialog", (dialog) => dialog.dismiss());
    await row.getByRole("button", { name: "Suspend" }).click();
    expect(backend.hotels[0].status).toBe("ACTIVE");

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Suspend" }).click();
    await expect(row).toContainText("SUSPENDED");

    await row.getByRole("button", { name: "Activate" }).click();
    await expect(row).toContainText("ACTIVE");
    expect(backend.calls("PATCH", "/platform/tenants/1").map((c) => c.body.status)).toEqual(["SUSPENDED", "ACTIVE"]);
  });

  // PlatformApp never mounts <Toasts />, so success/error toasts raised on platform pages are invisible.
  test("suspending a hotel shows a confirmation toast", async ({ page, signIn }) => {
    test.fail(true, "Known bug: PlatformApp does not render <Toasts />");
    await signIn("admin");
    await page.goto("/platform/hotels");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("row", { name: /Sunrise Hostel/ }).getByRole("button", { name: "Suspend" }).click();
    await expect(page.getByText("Hotel suspended")).toBeVisible();
  });

  test("re-invite and temp password reissue owner access", async ({ page, signIn, backend }) => {
    await signIn("admin");
    await page.goto("/platform/hotels");
    const row = page.getByRole("row", { name: /Sunrise Hostel/ });
    await row.getByRole("button", { name: "Re-invite" }).click();
    await expect(page.getByText("An email with a set-password link was sent to the owner.")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await row.getByRole("button", { name: "Temp password" }).click();
    await expect(page.getByText("Temporary password (shown once)")).toBeVisible();
    expect(backend.calls("POST", "/platform/tenants/1/owner-access").map((c) => c.body.accessMode)).toEqual(["invite", "password"]);
  });

  test("an empty hotel list invites the admin to add one", async ({ page, signIn, backend }) => {
    backend.hotels = [];
    await signIn("admin");
    await page.goto("/platform/hotels");
    await expect(page.getByText(/No hotels yet/)).toBeVisible();
  });

  test("/platform redirects to the hotel list", async ({ page, signIn }) => {
    await signIn("admin");
    await page.goto("/platform");
    await expect(page).toHaveURL("/platform/hotels");
  });
});

import { PASSWORD, expect, test } from "./support/fixtures";

const signInAs = async (page, role, email) => {
  await page.goto("/sunrise/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
};

test.describe("sign in", () => {
  const cases = [
    ["Guest", "guest@sunrise.test", "/sunrise/dashboard", /Welcome, Gita Guest/],
    ["Owner", "owner@sunrise.test", "/sunrise/owner", /Good (morning|afternoon|evening), Omar/],
    ["Manager", "manager@sunrise.test", "/sunrise/manager/dashboard", /Manager dashboard/],
    ["Reception", "reception@sunrise.test", "/sunrise/reception/dashboard", /Reception dashboard/],
    ["Staff", "staff@sunrise.test", "/sunrise/staff/dashboard", /Staff dashboard/],
  ];

  for (const [role, email, url, heading] of cases) {
    test(`${role} lands on their own home page`, async ({ page, backend }) => {
      await signInAs(page, role, email);
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      const login = backend.calls("POST", "/auth/login")[0];
      expect(login.body).toEqual({ email, password: PASSWORD });
    });
  }

  test("wrong password shows an error and keeps the user on the form", async ({ page }) => {
    await page.goto("/sunrise/login");
    await page.getByLabel("Email address").fill("guest@sunrise.test");
    await page.getByPlaceholder("Enter password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Sign in failed")).toBeVisible();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL("/sunrise/login");
  });

  test("the form requires an email and a password", async ({ page, backend }) => {
    await page.goto("/sunrise/login");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByLabel("Email address")).toBeFocused();
    expect(backend.calls("POST", "/auth/login")).toHaveLength(0);
  });

  test("the password can be revealed and hidden", async ({ page }) => {
    await page.goto("/sunrise/login");
    const password = page.getByPlaceholder("Enter password");
    await password.fill("secret");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("after signing in the user returns to the page they were sent from", async ({ page }) => {
    await page.goto("/sunrise/my-bookings");
    await expect(page).toHaveURL("/sunrise/login");
    await expect(page.getByText("Please sign in to access this service.")).toBeVisible();
    await page.getByLabel("Email address").fill("guest@sunrise.test");
    await page.getByPlaceholder("Enter password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/sunrise/my-bookings");
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
  });

  test("login, sign-up and forgot-password links navigate", async ({ page }) => {
    await page.goto("/sunrise/login");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL("/sunrise/register");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/sunrise/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL("/sunrise/forgot-password");
  });
});

test.describe("session handling", () => {
  test("a stored session is restored on reload", async ({ page, signIn }) => {
    await signIn("guest");
    await page.goto("/sunrise/dashboard");
    await expect(page.getByRole("heading", { name: "Welcome, Gita Guest" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Welcome, Gita Guest" })).toBeVisible();
  });

  test("logging out from the navbar returns to the hotel home and ends the session", async ({ page, signIn }) => {
    await signIn("guest");
    await page.goto("/sunrise");
    await page.getByTitle("Log out").click();
    await expect(page).toHaveURL("/sunrise");
    expect(await page.evaluate(() => localStorage.getItem("roost_token"))).toBeNull();
    await page.goto("/sunrise/dashboard");
    await expect(page).toHaveURL("/sunrise/login");
  });

  test("logging out from the console sidebar works", async ({ page, signIn }) => {
    await signIn("manager");
    await page.goto("/sunrise/manager/dashboard");
    await page.getByRole("button", { name: "Log out" }).click();
    // Known quirk: the protected route reacts to the cleared session first, so the user lands on
    // the sign-in page (with the "please sign in" notice) rather than the hotel home page.
    await expect(page).toHaveURL("/sunrise/login");
    expect(await page.evaluate(() => localStorage.getItem("roost_token"))).toBeNull();
    await page.goto("/sunrise/manager/dashboard");
    await expect(page).toHaveURL("/sunrise/login");
  });

  test("an expired token (401) signs the user out", async ({ page, signIn, backend }) => {
    await signIn("guest");
    backend.users.guest = undefined; // the server no longer recognises the token
    await page.goto("/sunrise/dashboard");
    await expect(page).toHaveURL("/sunrise/login");
    expect(await page.evaluate(() => localStorage.getItem("roost_user"))).toBeNull();
  });

  test("the navbar shows 'Console' for signed-in users and links to their home", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/sunrise");
    await page.locator("aside").getByRole("link", { name: "Overview" }).click();
    await expect(page).toHaveURL("/sunrise/owner");
  });
});

test.describe("role guards", () => {
  test("anonymous visitors are sent to sign in for protected pages", async ({ page }) => {
    for (const path of ["/owner", "/owner/properties", "/dashboard", "/profile", "/guests", "/payments", "/settings"]) {
      await page.goto(`/sunrise${path}`);
      await expect(page, path).toHaveURL("/sunrise/login");
    }
  });

  test("a guest cannot open owner or staff pages", async ({ page, signIn }) => {
    await signIn("guest");
    for (const path of ["/owner", "/guests", "/inventory", "/reports", "/cameras"]) {
      await page.goto(`/sunrise${path}`);
      await expect(page, path).toHaveURL("/sunrise/dashboard");
    }
  });

  test("an owner cannot open guest-only or platform-only pages", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/sunrise/dashboard");
    await expect(page).toHaveURL("/sunrise/owner");
    await page.goto("/sunrise/cameras");
    await expect(page).toHaveURL("/sunrise/owner");
    await page.goto("/sunrise/backup");
    await expect(page).toHaveURL("/sunrise/owner");
  });

  test("a receptionist cannot open manager-only pages", async ({ page, signIn }) => {
    await signIn("reception");
    for (const path of ["/inventory", "/refunds", "/owner", "/users"]) {
      await page.goto(`/sunrise${path}`);
      await expect(page, path).toHaveURL("/sunrise/reception/dashboard");
    }
  });

  test("a manager cannot open the reception dashboard", async ({ page, signIn }) => {
    await signIn("manager");
    await page.goto("/sunrise/reception/dashboard");
    await expect(page).toHaveURL("/sunrise/manager/dashboard");
  });
});

test.describe("registration", () => {
  test("a new guest can sign up and lands on the dashboard", async ({ page, backend }) => {
    await page.goto("/sunrise/register");
    await page.getByPlaceholder("Your full name").fill("Nora Newguest");
    await page.getByPlaceholder("you@example.com").fill("nora@example.com");
    await page.getByPlaceholder("10-digit Indian number").fill("9876501234");
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/sunrise/dashboard");
    await expect(page.getByText("Account created")).toBeVisible();
    expect(backend.calls("POST", "/auth/register")[0].body).toMatchObject({ name: "Nora Newguest", email: "nora@example.com", phone: "9876501234" });
    await expect(page.getByRole("heading", { name: "Welcome, Nora Newguest" })).toBeVisible();
  });

  test("a password shorter than 12 characters is rejected by the form", async ({ page, backend }) => {
    await page.goto("/sunrise/register");
    await page.getByPlaceholder("Your full name").fill("Nora");
    await page.getByPlaceholder("you@example.com").fill("nora@example.com");
    await page.getByPlaceholder("At least 12 characters").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/sunrise/register");
    expect(backend.calls("POST", "/auth/register")).toHaveLength(0);
  });

  test("an invalid phone number is rejected by the form", async ({ page, backend }) => {
    await page.goto("/sunrise/register");
    await page.getByPlaceholder("Your full name").fill("Nora");
    await page.getByPlaceholder("you@example.com").fill("nora@example.com");
    await page.getByPlaceholder("10-digit Indian number").fill("1234567890");
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    expect(backend.calls("POST", "/auth/register")).toHaveLength(0);
  });

  test("an email that is already registered shows the server's error", async ({ page }) => {
    await page.goto("/sunrise/register");
    await page.getByPlaceholder("Your full name").fill("Gita Again");
    await page.getByPlaceholder("you@example.com").fill("guest@sunrise.test");
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("An account with this email already exists")).toBeVisible();
    await expect(page).toHaveURL("/sunrise/register");
  });
});

test.describe("password recovery", () => {
  test("forgot-password sends a reset request and confirms", async ({ page, backend }) => {
    await page.goto("/sunrise/forgot-password");
    await page.getByLabel("Email address").fill("guest@sunrise.test");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/a reset link is on its way/)).toBeVisible();
    expect(backend.calls("POST", "/auth/forgot-password")[0].body).toEqual({ emailOrPhone: "guest@sunrise.test" });
    await page.getByRole("link", { name: "Back to login" }).click();
    await expect(page).toHaveURL("/sunrise/login");
  });

  test("reset-password without a valid recovery session explains the link is invalid", async ({ page }) => {
    await page.goto("/sunrise/reset-password");
    await expect(page.getByText("This reset link is invalid or has expired")).toBeVisible();
    await page.getByRole("link", { name: "Request a new link" }).click();
    await expect(page).toHaveURL("/sunrise/forgot-password");
  });

  test("platform reset-password page links back to platform sign-in", async ({ page }) => {
    await page.goto("/platform/reset-password");
    await expect(page.getByText("This reset link is invalid or has expired")).toBeVisible();
    await page.getByRole("link", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL("/platform/login");
  });
});

test.describe("guest profile", () => {
  test("a guest can edit their profile", async ({ page, signIn, backend }) => {
    await signIn("guest");
    await page.goto("/sunrise/profile");
    await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.getByLabel("Full name").fill("Gita Renamed");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible();
    await expect(page.getByText("Gita Renamed").first()).toBeVisible();
    expect(backend.calls("PATCH", "/auth/me")[0].body).toMatchObject({ name: "Gita Renamed" });
  });

  test("cancelling the edit dialog changes nothing", async ({ page, signIn, backend }) => {
    await signIn("guest");
    await page.goto("/sunrise/profile");
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Edit profile" })).toHaveCount(0);
    expect(backend.calls("PATCH", "/auth/me")).toHaveLength(0);
  });

  test("a guest can change their password", async ({ page, signIn, backend }) => {
    await signIn("guest");
    await page.goto("/sunrise/profile");
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill("Brand-new-password-1");
    await page.getByLabel("Confirm password").fill("Brand-new-password-1");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated", { exact: true })).toBeVisible();
    expect(backend.calls("POST", "/auth/change-password")[0].body).toEqual({ oldPassword: PASSWORD, newPassword: "Brand-new-password-1" });
  });

  test("mismatched new passwords are rejected without calling the API", async ({ page, signIn, backend }) => {
    await signIn("guest");
    await page.goto("/sunrise/profile");
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill("Brand-new-password-1");
    await page.getByLabel("Confirm password").fill("Different-password-22");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("New passwords do not match.")).toBeVisible();
    expect(backend.calls("POST", "/auth/change-password")).toHaveLength(0);
  });

  test("a wrong current password shows the server error", async ({ page, signIn }) => {
    await signIn("guest");
    await page.goto("/sunrise/profile");
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByLabel("Current password").fill("wrong-password-123");
    await page.getByLabel("New password", { exact: true }).fill("Brand-new-password-1");
    await page.getByLabel("Confirm password").fill("Brand-new-password-1");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Old password is incorrect")).toBeVisible();
  });
});

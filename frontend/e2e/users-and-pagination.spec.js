import { expect, test } from "./support/fixtures";

const toast = (page, title) => page.getByText(title, { exact: true });
const modal = (page) => page.locator("div.fixed.inset-0");

test.describe("team & roles: reset password and delete", () => {
  test.beforeEach(async ({ signIn }) => { await signIn("owner"); });

  test("reset password asks for confirmation, then shows the new password once", async ({ page, backend }) => {
    await page.goto("/sunrise/users");
    const row = page.getByRole("row", { name: /Sam Staff/ });

    await row.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByRole("heading", { name: "Reset password?" })).toBeVisible();
    await modal(page).getByRole("button", { name: "Cancel" }).click();
    expect(backend.calls("POST", "/management/users/s1/reset-password")).toHaveLength(0);

    await row.getByRole("button", { name: "Reset password" }).click();
    await modal(page).getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByRole("heading", { name: "Temporary password" })).toBeVisible();
    await expect(page.getByText("Temp-1-generated!a1")).toBeVisible();
    await expect(modal(page).getByText("staff@sunrise.test")).toBeVisible();
    expect(backend.calls("POST", "/management/users/s1/reset-password")).toHaveLength(1);

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText("Temp-1-generated!a1")).toHaveCount(0);
  });

  test("delete asks for confirmation and can be cancelled", async ({ page, backend }) => {
    await page.goto("/sunrise/users");
    await page.getByRole("row", { name: /Sam Staff/ }).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("heading", { name: "Delete user?" })).toBeVisible();
    await expect(page.getByText(/cannot be undone/)).toBeVisible();
    await modal(page).getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Delete user?" })).toHaveCount(0);
    expect(backend.calls("DELETE", "/management/users")).toHaveLength(0);
    await expect(page.getByRole("row", { name: /Sam Staff/ })).toBeVisible();
  });

  test("confirming delete removes the user", async ({ page, backend }) => {
    await page.goto("/sunrise/users");
    await page.getByRole("row", { name: /Sam Staff/ }).getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete user" }).click();
    await expect(toast(page, "User deleted")).toBeVisible();
    await expect(page.getByRole("row", { name: /Sam Staff/ })).toHaveCount(0);
    expect(backend.calls("DELETE", "/management/users/s1")).toHaveLength(1);
  });

  test("a user with recorded activity cannot be deleted and the reason is shown", async ({ page, backend }) => {
    backend.managedUsers[1].hasHistory = true;
    await page.goto("/sunrise/users");
    await page.getByRole("row", { name: /Sam Staff/ }).getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete user" }).click();
    await expect(toast(page, "Request failed")).toBeVisible();
    await expect(page.getByText(/Suspend it instead/)).toBeVisible();
    await expect(page.getByRole("row", { name: /Sam Staff/ })).toBeVisible();
  });

  test("the owner's own row has no destructive actions", async ({ page, backend }) => {
    backend.managedUsers.push({ id: "u-owner", name: "Omar Owner", email: "owner@sunrise.test", role: "OWNER", status: "ACTIVE", tenantId: "1" });
    await page.goto("/sunrise/users");
    await expect(page.getByRole("row", { name: /Omar Owner/ }).getByRole("button")).toHaveCount(0);
  });
});

test("a manager can reset a receptionist's password", async ({ page, signIn, backend }) => {
  await signIn("manager");
  backend.managedUsers.push({ id: "r1", name: "Ravi Reception", email: "reception@sunrise.test", role: "RECEPTIONIST", status: "ACTIVE", tenantId: "1" });
  await page.goto("/sunrise/staff");
  await page.getByRole("row", { name: /Ravi Reception/ }).getByRole("button", { name: "Reset password" }).click();
  await modal(page).getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByText("Temp-1-generated!a1")).toBeVisible();
});

const many = (count, make) => Array.from({ length: count }, (_, i) => make(i + 1));

test.describe("pagination", () => {
  test("owner properties: 10 per page, page links, next/prev and search reset", async ({ page, signIn, backend }) => {
    backend.properties = many(25, (n) => ({ id: String(500 + n), slug: `prop-${n}`, name: `Property ${String(n).padStart(2, "0")}`, city: "Pune", status: "PUBLISHED", roomsCount: 0, bedsCount: 0 }));
    await signIn("owner");
    await page.goto("/sunrise/owner/properties");
    await expect(page.getByRole("row", { name: /Property \d\d/ })).toHaveCount(10);
    await expect(page.getByText("Showing 1–10 of 25")).toBeVisible();
    await expect(page.getByRole("row", { name: /Property 01/ })).toBeVisible();

    await page.getByRole("button", { name: "Go to page 3" }).click();
    await expect(page.getByText("Showing 21–25 of 25")).toBeVisible();
    await expect(page.getByRole("row", { name: /Property \d\d/ })).toHaveCount(5);

    await page.getByRole("button", { name: "Previous page" }).click();
    await expect(page.getByText("Showing 11–20 of 25")).toBeVisible();

    await page.getByPlaceholder("Search…").fill("Property 07");
    await expect(page.getByRole("row", { name: /Property 07/ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
    await page.getByPlaceholder("Search…").fill("");
    await expect(page.getByText("Showing 1–10 of 25")).toBeVisible(); // back on page 1
  });

  test("no pager is shown when everything fits on one page", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/sunrise/owner/properties");
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
  });

  test("owner bookings are paginated", async ({ page, signIn, backend }) => {
    backend.bookings = many(23, (n) => ({ ...backend.bookings[0], id: `bk${n}`, bookingCode: `BK-${String(n).padStart(3, "0")}` }));
    await signIn("owner");
    await page.goto("/sunrise/owner/bookings");
    await expect(page.getByText("Showing 1–10 of 23")).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByRole("row", { name: /BK-011/ })).toBeVisible();
  });

  test("data tables (guests) use the same pager", async ({ page, signIn, backend }) => {
    backend.guests = many(12, (n) => ({ id: `g${n}`, name: `Guest ${String(n).padStart(2, "0")}`, email: `g${n}@x.test`, phone: "9000000000", status: "ACTIVE", profile: {} }));
    await signIn("reception");
    await page.goto("/sunrise/guests");
    await expect(page.getByText("Showing 1–10 of 12")).toBeVisible();
    await page.getByRole("button", { name: "Go to page 2" }).click();
    await expect(page.getByText("Showing 11–12 of 12")).toBeVisible();
    await expect(page.getByRole("row", { name: /Guest 12/ })).toBeVisible();
  });

  test("a guest's My bookings pages 5 at a time", async ({ page, signIn, backend }) => {
    backend.bookings = many(7, (n) => ({ ...backend.bookings[0], id: `bk${n}`, bookingCode: `GB-${n}`, guestId: "u-guest" }));
    await signIn("guest");
    await page.goto("/sunrise/my-bookings");
    await expect(page.getByText("Showing 1–5 of 7")).toBeVisible();
    await expect(page.getByText("GB-6")).toHaveCount(0);
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText("GB-6").first()).toBeVisible();
  });

  test("property search pages 12 stays at a time", async ({ page, backend }) => {
    backend.properties = many(14, (n) => ({ id: String(600 + n), slug: `s-${n}`, name: `Stay ${String(n).padStart(2, "0")}`, city: "Pune", price: 500, bedsCount: 2, status: "PUBLISHED" }));
    await page.goto("/sunrise/properties");
    await expect(page.getByText("Showing 1–12 of 14")).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByRole("heading", { name: "Stay 14" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stay 01" })).toHaveCount(0);
  });

  test("platform hotel list is paginated", async ({ page, signIn, backend }) => {
    backend.hotels = many(11, (n) => ({ ...backend.hotels[0], id: String(700 + n), slug: `hotel-${n}`, name: `Hotel ${String(n).padStart(2, "0")}` }));
    await signIn("admin");
    await page.goto("/platform/hotels");
    await expect(page.getByText("Showing 1–10 of 11")).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByRole("row", { name: /Hotel 11/ })).toBeVisible();
  });

  test("a guest's complaint history is paginated", async ({ page, signIn, backend }) => {
    backend.myComplaints = many(7, (n) => ({ id: `c${n}`, complaintCode: `CMP-${n}`, subject: `Issue ${n}`, status: "OPEN", priority: "LOW" }));
    await signIn("guest");
    await page.goto("/sunrise/complaints");
    await expect(page.getByText("Showing 1–5 of 7")).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText("Issue 7")).toBeVisible();
  });
});

import { PASSWORD, expect, test } from "./support/fixtures";

const toast = (page, title) => page.getByText(title, { exact: true });

test.describe("dashboards", () => {
  test("manager dashboard shows live KPIs and a working sidebar", async ({ page, signIn }) => {
    await signIn("manager");
    await page.goto("/sunrise/manager/dashboard");
    await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
    await expect(page.getByText("Total beds")).toBeVisible();
    await expect(page.getByText("24", { exact: true })).toBeVisible();
    await expect(page.getByText("₹1,25,000")).toBeVisible();
    await page.locator("aside").getByRole("link", { name: "Guests" }).click();
    await expect(page).toHaveURL("/sunrise/guests");
  });

  test("reception dashboard shows in-house guests and bed occupancy", async ({ page, signIn }) => {
    await signIn("reception");
    await page.goto("/sunrise/reception/dashboard");
    await expect(page.getByRole("heading", { name: "Reception dashboard" })).toBeVisible();
    await expect(page.getByText("Guests in house")).toBeVisible();
    await expect(page.getByText("Occupied beds")).toBeVisible();
    await expect(page.getByText("Collected today")).toBeVisible();
  });

  test("an API failure on a dashboard is shown, not swallowed", async ({ page, signIn }) => {
    await signIn("manager");
    await page.route("**/api/v1/analytics/dashboard", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, message: "Analytics down" }) }));
    await page.goto("/sunrise/manager/dashboard");
    await expect(page.getByText("Analytics down")).toBeVisible();
  });
});

test.describe("bookings approval (manager)", () => {
  test("manager approves pending bookings from the bookings list", async ({ page, backend, signIn }) => {
    await signIn("manager");
    await page.goto("/sunrise/bookings");
    const row = page.getByRole("row", { name: /ROOST-0001/ });
    await expect(row).toContainText("PENDING");
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(toast(page, "Booking approved")).toBeVisible();
    await expect(row).toContainText("CONFIRMED");
    // Already-confirmed bookings keep a disabled button that explains why.
    const confirmed = page.getByRole("row", { name: /ROOST-0002/ });
    await expect(confirmed.getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(confirmed.locator("span[title]")).toHaveAttribute("title", /already confirmed/);
    expect(backend.bookings[0].status).toBe("CONFIRMED");
  });
});

test.describe("guests (front desk)", () => {
  test.beforeEach(async ({ signIn }) => { await signIn("reception"); });

  test("lists and searches guests", async ({ page, backend }) => {
    await page.goto("/sunrise/guests");
    await expect(page.getByRole("row", { name: /Walk In Wendy/ })).toBeVisible();
    await page.getByPlaceholder("Search name, email or phone").fill("zzz");
    await expect(page.getByText("No records found.")).toBeVisible();
    expect(backend.calls("GET", "/reception/guests").some((c) => c.query.get("search") === "zzz")).toBe(true);
  });

  test("registers a walk-in guest", async ({ page, backend }) => {
    await page.goto("/sunrise/guests/register");
    await page.getByLabel("Full name").fill("Rhea Walker");
    await page.getByLabel("Phone").fill("9811122233");
    await page.getByLabel("Email").fill("rhea@example.com");
    await page.getByLabel("Gender").selectOption("Female");
    await page.getByLabel("City").fill("Pune");
    await page.getByRole("button", { name: "Register guest" }).click();
    await expect(toast(page, "Guest registered")).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("");
    expect(backend.calls("POST", "/reception/guests")[0].body).toMatchObject({ name: "Rhea Walker", phone: "9811122233", gender: "FEMALE", city: "Pune" });
  });

  test("an invalid phone number is blocked by the form", async ({ page, backend }) => {
    await page.goto("/sunrise/guests/register");
    await page.getByLabel("Full name").fill("Bad Phone");
    await page.getByLabel("Phone").fill("12345");
    await page.getByRole("button", { name: "Register guest" }).click();
    expect(backend.calls("POST", "/reception/guests")).toHaveLength(0);
  });

  test("opens a guest profile from the list", async ({ page }) => {
    await page.goto("/sunrise/guests");
    await page.getByRole("row", { name: /Walk In Wendy/ }).getByRole("link", { name: "View" }).click();
    await expect(page).toHaveURL("/sunrise/guests/g1");
    await expect(page.getByRole("heading", { name: "Walk In Wendy" })).toBeVisible();
    await expect(page.getByText("AADHAAR")).toBeVisible();
  });

  test("an unknown guest id says 'Guest not found'", async ({ page }) => {
    await page.goto("/sunrise/guests/nope");
    await expect(page.getByText("Guest not found.")).toBeVisible();
  });

  test("the 'Register guest' button on the list opens the form", async ({ page }) => {
    await page.goto("/sunrise/guests");
    await page.getByRole("link", { name: /Register guest/ }).click();
    await expect(page).toHaveURL("/sunrise/guests/register");
  });
});

test.describe("bookings, beds and stays (front desk)", () => {
  test.beforeEach(async ({ signIn }) => { await signIn("reception"); });

  test("receptionists can view bookings but not approve them", async ({ page }) => {
    await page.goto("/sunrise/bookings");
    const row = page.getByRole("row", { name: /ROOST-0001/ });
    await expect(row).toContainText("PENDING");
    await expect(row.getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(row.locator("span[title]")).toHaveAttribute("title", /manager or the owner/);
  });

  test("creates a front-desk booking", async ({ page, backend }) => {
    await page.goto("/sunrise/bookings/new");
    await page.getByLabel("Guest").selectOption("g1");
    await page.getByLabel("Property").selectOption("11");
    await page.getByLabel("Room").selectOption("101");
    await page.getByLabel("Bed").selectOption("1001");
    await page.getByLabel("Check-in").fill("2030-01-10");
    await page.getByLabel("Check-out").fill("2030-01-12");
    await page.getByRole("button", { name: "Create booking" }).click();
    await expect(toast(page, "Booking created")).toBeVisible();
    expect(backend.calls("POST", "/reception/bookings")[0].body).toMatchObject({ guestId: "g1", bedId: "1001", source: "WALK_IN" });
  });

  test("/bed-allocation redirects to the new-booking form", async ({ page }) => {
    await page.goto("/sunrise/bed-allocation");
    await expect(page).toHaveURL("/sunrise/bookings/new");
  });

  test("bed grid shows live occupancy after choosing a property", async ({ page }) => {
    await page.goto("/sunrise/beds");
    await page.locator("select").first().selectOption("11");
    await expect(page.getByText("Total beds")).toBeVisible();
    await expect(page.getByText("Occupied beds")).toBeVisible();
    await expect(page.locator("article", { hasText: "101-A" })).toContainText("AVAILABLE");
    await expect(page.locator("article", { hasText: "101-B" })).toContainText("Gita Guest");
    await page.getByRole("button", { name: /^Reserved/ }).click();
    await expect(page.locator("article", { hasText: "Room 101" })).toHaveCount(1);
  });

  test("check-in opens a pre-filled form and records the guest's ID", async ({ page, backend }) => {
    await page.goto("/sunrise/check-in?code=ROOST-0002");
    await expect(page.getByLabel("Full name")).toHaveValue("Gita Guest");
    await expect(page.getByLabel("Property")).toHaveValue("Sunrise Lake");
    await page.getByLabel("Identity document type").selectOption("AADHAAR");
    await page.getByLabel("Identity document number").fill("1234 5678 9012");
    await page.getByRole("button", { name: "Confirm check-in" }).click();
    await expect(toast(page, "Guest checked in")).toBeVisible();
    await expect(page).toHaveURL("/sunrise/check-in");
    expect(backend.bookings[1].status).toBe("CHECKED_IN");
    expect(backend.calls("PATCH", "/reception/bookings/ROOST-0002/check-in")[0].body).toEqual({ idProofType: "AADHAAR", idProofNumber: "1234 5678 9012" });
  });

  test("a booking code typed at the desk opens the check-in form", async ({ page }) => {
    await page.goto("/sunrise/check-in");
    await page.getByLabel("Booking code").fill("ROOST-0002");
    await page.getByRole("button", { name: "Find booking" }).click();
    await expect(page).toHaveURL("/sunrise/check-in?code=ROOST-0002");
    await expect(page.getByLabel("Full name")).toHaveValue("Gita Guest");
  });

  test("check-in is blocked for a booking that is still pending", async ({ page, backend }) => {
    await page.goto("/sunrise/check-in?code=ROOST-0001");
    await expect(page.getByText("still waiting for approval")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm check-in" })).toBeDisabled();
    expect(backend.bookings[0].status).toBe("PENDING");
  });

  test("check-out completes a stay", async ({ page, backend }) => {
    backend.bookings[1].status = "CHECKED_IN";
    await page.goto("/sunrise/check-out");
    await page.getByLabel("Booking code").fill("ROOST-0002");
    await page.getByRole("button", { name: "Confirm check-out" }).click();
    await expect(toast(page, "Guest checked out")).toBeVisible();
    expect(backend.bookings[1].status).toBe("COMPLETED");
  });

  test("an unknown booking code is reported", async ({ page }) => {
    await page.goto("/sunrise/check-out");
    await page.getByLabel("Booking code").fill("NOPE");
    await page.getByRole("button", { name: "Confirm check-out" }).click();
    await expect(page.getByText("Booking not found")).toBeVisible();
  });
});

test.describe("finance", () => {
  test.beforeEach(async ({ signIn }) => { await signIn("reception"); });

  test("lists today's payments with cash/online totals and collects a split payment", async ({ page, backend }) => {
    backend.bookings[0].status = "CONFIRMED";
    await page.goto("/sunrise/payments");
    await expect(page.getByRole("row", { name: /PAY-1/ })).toContainText("₹2,400");
    await page.getByRole("combobox").fill("ROOST-0001");
    await page.getByRole("option", { name: /ROOST-0001/ }).click();
    await page.getByLabel("Cash amount (₹)").fill("1000");
    await page.getByLabel("Online amount (₹)").fill("800");
    await page.getByRole("button", { name: "Collect payment" }).click();
    await expect(toast(page, "Payment collected")).toBeVisible();
    await expect(page.getByRole("row", { name: /ROOST-0001/ })).toHaveCount(2);
    expect(backend.calls("POST", "/finance/payments")[0].body).toEqual({ bookingId: "b-seed", splits: [{ method: "CASH", amount: 1000 }, { method: "UPI", amount: 800 }] });
  });

  test("payments can be reviewed for another day", async ({ page, backend }) => {
    await page.goto("/sunrise/payments");
    await page.getByLabel("Date").fill("2020-01-01");
    await expect(page.getByText("No records found.")).toBeVisible();
    expect(backend.calls("GET", "/finance/payments").some((c) => c.query.get("from") && c.query.get("to"))).toBe(true);
  });

  test("collecting is disabled until a booking and an amount are entered", async ({ page, backend }) => {
    await page.goto("/sunrise/payments");
    await expect(page.getByRole("button", { name: "Collect payment" })).toBeDisabled();
    expect(backend.calls("POST", "/finance/payments")).toHaveLength(0);
  });

  test("invoice lookup finds an invoice and rejects an unknown number", async ({ page }) => {
    await page.goto("/sunrise/invoices");
    await page.getByPlaceholder("Invoice number").fill("INV-404");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("Invoice not found")).toBeVisible();
    await page.getByPlaceholder("Invoice number").fill("INV-100");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(toast(page, "Invoice loaded")).toBeVisible();
    await expect(page.getByText("Total: ₹2,400")).toBeVisible();
  });

  test("the printable invoice page shows the amounts and guest", async ({ page }) => {
    await page.goto("/sunrise/invoices/INV-100");
    await expect(page.getByText("Official payment invoice")).toBeVisible();
    await expect(page.getByText("INV-100", { exact: true })).toBeVisible();
    await expect(page.getByText("Gita Guest")).toBeVisible();
    await expect(page.getByRole("cell", { name: /₹2,400\.00/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Print/ })).toBeVisible();
  });

  test("an unknown invoice page offers a way back to lookup", async ({ page }) => {
    await page.goto("/sunrise/invoices/INV-404");
    await expect(page.getByRole("heading", { name: "Invoice unavailable" })).toBeVisible();
    await page.getByRole("link", { name: "Invoice lookup" }).click();
    await expect(page).toHaveURL("/sunrise/invoices");
  });

});

test.describe("refunds", () => {
  test("refunds are available to managers and can be requested", async ({ page, signIn, backend }) => {
    await signIn("manager");
    await page.goto("/sunrise/refunds");
    await page.getByLabel("Payment ID").fill("p1");
    await page.getByLabel("Amount").fill("500");
    await page.getByLabel("Reason").fill("Guest left early");
    await page.getByRole("button", { name: "Request refund" }).click();
    await expect(toast(page, "Refund requested")).toBeVisible();
    expect(backend.calls("POST", "/finance/refunds")[0].body).toEqual({ paymentId: "p1", amount: 500, reason: "Guest left early" });
  });

  test("a refund reason shorter than 5 characters is blocked", async ({ page, signIn, backend }) => {
    await signIn("manager");
    await page.goto("/sunrise/refunds");
    await page.getByLabel("Payment ID").fill("p1");
    await page.getByLabel("Amount").fill("500");
    await page.getByLabel("Reason").fill("no");
    await page.getByRole("button", { name: "Request refund" }).click();
    expect(backend.calls("POST", "/finance/refunds")).toHaveLength(0);
  });
});

test.describe("management", () => {
  test("a manager can add and suspend staff, but only for STAFF/RECEPTIONIST roles", async ({ page, signIn, backend }) => {
    await signIn("manager");
    await page.goto("/sunrise/staff");
    await expect(page.getByRole("heading", { name: "Staff" })).toBeVisible();
    expect(await page.getByLabel("Role").locator("option").allTextContents()).toEqual(["STAFF", "RECEPTIONIST"]);
    await page.getByLabel("Name").fill("Sia Staff");
    await page.getByLabel("Email").fill("sia@sunrise.test");
    await page.getByLabel("Temporary password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(toast(page, "User created")).toBeVisible();
    await expect(page.getByRole("row", { name: /Sia Staff/ })).toBeVisible();
    // Managers cannot act on other managers.
    await expect(page.getByRole("row", { name: /Mia Manager/ }).getByRole("button")).toHaveCount(0);
    await page.getByRole("row", { name: /Sia Staff/ }).getByRole("button", { name: "Suspend" }).click();
    await expect(toast(page, "Status updated")).toBeVisible();
    expect(backend.managedUsers.find((u) => u.name === "Sia Staff").status).toBe("SUSPENDED");
  });

  test("a short temporary password is blocked", async ({ page, signIn, backend }) => {
    await signIn("manager");
    await page.goto("/sunrise/staff");
    await page.getByLabel("Name").fill("Sia");
    await page.getByLabel("Email").fill("sia@sunrise.test");
    await page.getByLabel("Temporary password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    expect(backend.calls("POST", "/management/users")).toHaveLength(0);
  });

  test("the managers and receptionists pages filter by role", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/sunrise/managers");
    await expect(page.getByRole("row", { name: /Mia Manager/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Sam Staff/ })).toHaveCount(0);
    await page.goto("/sunrise/receptionists");
    await expect(page.getByText("No records found.")).toBeVisible();
  });

  test("inventory lists items with low-stock alerts and adds new ones", async ({ page, signIn, backend }) => {
    await signIn("manager");
    await page.goto("/sunrise/inventory");
    await expect(page.getByRole("row", { name: /Pillows/ })).toContainText("Low stock");
    await page.getByLabel("Property").selectOption("11");
    await page.getByLabel("Item name").fill("Towels");
    await page.getByLabel("Opening stock").fill("20");
    await page.getByLabel("Minimum stock").fill("5");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(toast(page, "Inventory item created")).toBeVisible();
    await expect(page.getByRole("row", { name: /Towels/ })).toContainText("OK");
    expect(backend.calls("POST", "/management/inventory/items")[0].body).toMatchObject({ propertyId: "11", name: "Towels", openingStock: "20" });
  });

  test("complaints can be resolved by staff", async ({ page, signIn, backend }) => {
    await signIn("reception");
    await page.goto("/sunrise/complaints");
    const row = page.getByRole("row", { name: /Broken fan/ });
    await expect(row).toContainText("OPEN");
    await row.getByRole("button", { name: "Resolve" }).click();
    await expect(toast(page, "Complaint resolved")).toBeVisible();
    await expect(row).toContainText("RESOLVED");
    await expect(row.getByRole("button", { name: "Resolve" })).toHaveCount(0);
    expect(backend.calls("PATCH", "/experience/complaints/c1")[0].body.status).toBe("RESOLVED");
  });

  test("feedback analysis shows average ratings", async ({ page, signIn }) => {
    await signIn("manager");
    await page.goto("/sunrise/feedback");
    await expect(page.getByText("overall rating")).toBeVisible();
    await expect(page.getByText("4.5")).toBeVisible();
  });
});

test.describe("reports, analytics and system", () => {
  test("reports index links to each downloadable report", async ({ page, signIn }) => {
    await signIn("manager");
    await page.goto("/sunrise/reports");
    await page.getByRole("link", { name: "Occupancy" }).click();
    await expect(page).toHaveURL("/sunrise/reports/download?type=occupancy");
    await expect(page.getByRole("heading", { name: "Occupancy report" })).toBeVisible();
    await expect(page.getByRole("row", { name: /BOOKED 15/ })).toBeVisible();
    await page.getByRole("link", { name: /Back to reports/ }).click();
    await expect(page).toHaveURL("/sunrise/reports");
  });

  test("revenue and staff reports render their tables", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/sunrise/reports/download?type=revenue");
    await expect(page.getByRole("heading", { name: "Revenue report" })).toBeVisible();
    await expect(page.getByRole("row", { name: /UPI/ })).toContainText("₹9,600");
    await page.goto("/sunrise/reports/download?type=staff");
    await expect(page.getByRole("heading", { name: "Staff performance" })).toBeVisible();
    await expect(page.getByRole("row", { name: /BOOKING_APPROVED/ })).toBeVisible();
  });

  test("business-intelligence pages show weekly and monthly metrics", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/sunrise/bi");
    await expect(page.getByRole("heading", { name: "Business analytics" })).toBeVisible();
    await expect(page.getByText("Occupied beds")).toBeVisible();
    await page.goto("/sunrise/bi/weekly");
    await expect(page.getByText("7 days")).toBeVisible();
    await page.goto("/sunrise/bi/monthly");
    await expect(page.getByText("30 days")).toBeVisible();
    await expect(page.getByText("₹1,20,000")).toBeVisible();
  });

  test("a manager cannot open business intelligence", async ({ page, signIn }) => {
    await signIn("manager");
    await page.goto("/sunrise/bi");
    await expect(page).toHaveURL("/sunrise/manager/dashboard");
  });

  test("settings load, save and report success", async ({ page, signIn, backend }) => {
    await signIn("owner");
    await page.goto("/sunrise/settings");
    await expect(page.getByLabel("Property name")).toHaveValue("Sunrise Hostel");
    await page.getByLabel("Check-in time").fill("15:00");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(toast(page, "Settings updated")).toBeVisible();
    expect(backend.settings.GENERAL.check_in_time).toBe("15:00");
    expect(backend.calls("PATCH", "/system/settings")[0].body.settings).toContainEqual({ key: "check_in_time", value: "15:00", category: "GENERAL" });
  });

  test("audit logs are visible to owners", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/sunrise/audit-logs");
    await expect(page.getByRole("row", { name: /BOOKING_APPROVED/ })).toBeVisible();
  });

  test("platform-admin-only pages: access control, cameras, backup", async ({ page, signIn, backend }) => {
    await signIn("admin");
    await page.goto("/sunrise/access-control");
    await expect(page.getByRole("row", { name: /OWNER.*bookings:read, bookings:approve/ })).toBeVisible();

    await page.goto("/sunrise/cameras");
    await page.getByLabel("Enabled", { exact: true }).check();
    await page.getByLabel("Stream URL").fill("https://cam.example.test/stream");
    await page.getByRole("button", { name: /Save camera settings/ }).click();
    await expect(toast(page, "Camera settings updated")).toBeVisible();
    expect(backend.camera).toMatchObject({ enabled: true, streamUrl: "https://cam.example.test/stream" });

    await page.goto("/sunrise/backup");
    await expect(page.getByText("DAILY")).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /Request restore/ }).click();
    await expect(toast(page, "Restore request recorded")).toBeVisible();
  });
});

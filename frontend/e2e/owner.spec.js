import { PASSWORD, expect, test } from "./support/fixtures";

test.describe("owner onboarding", () => {
  test("a new owner must set a password, then complete the hotel profile", async ({ page, signIn, backend }) => {
    await signIn("newOwner");
    await page.goto("/sunrise/owner");
    await expect(page).toHaveURL("/sunrise/owner/setup");
    await expect(page.getByRole("heading", { name: "Choose your own password" })).toBeVisible();

    // Mismatch is caught client-side.
    await page.getByLabel("New password", { exact: true }).fill("Owner-new-pass-1");
    await page.getByLabel("Confirm password").fill("Owner-other-pass-2");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();

    await page.getByLabel("Confirm password").fill("Owner-new-pass-1");
    await page.getByRole("button", { name: "Update password" }).click().catch(() => {});
    // Supabase is disabled in this suite, so the password change itself cannot complete; the
    // profile form is reached once the flag is cleared server-side.
    backend.users.newOwner.mustChangePassword = false;
    await page.reload();
    await expect(page.getByRole("heading", { name: "Tell us about your hotel" })).toBeVisible();
    await expect(page.getByText("WELCOME — STEP 1 OF 1")).toBeVisible();

    await page.locator('input[name="displayName"]').fill("Sunrise Renamed");
    await page.locator('input[name="contactPhone"]').fill("9876500000");
    await page.locator('input[name="address"]').fill("99 New Street");
    await page.locator('input[name="city"]').fill("Pune");
    await page.locator('input[name="tagline"]').fill("Stay awhile");
    await page.getByRole("button", { name: "Save and continue" }).click();

    await expect(page).toHaveURL("/sunrise/owner");
    await expect(page.getByText("Your hotel is ready")).toBeVisible();
    const patch = backend.calls("PATCH", "/tenant/me")[0].body;
    expect(patch).toMatchObject({ displayName: "Sunrise Renamed", contactPhone: "9876500000", address: "99 New Street", city: "Pune", tagline: "Stay awhile", completeOnboarding: true });
  });

  test("required profile fields block saving", async ({ page, signIn, backend }) => {
    await signIn("newOwner");
    backend.users.newOwner.mustChangePassword = false;
    await page.goto("/sunrise/owner/setup");
    await page.locator('input[name="contactPhone"]').fill("");
    await page.getByRole("button", { name: "Save and continue" }).click();
    expect(backend.calls("PATCH", "/tenant/me")).toHaveLength(0);
  });

  test("an onboarded owner can edit the profile and cancel back", async ({ page, signIn, backend }) => {
    await signIn("owner");
    await page.goto("/sunrise/owner/setup");
    await expect(page.getByRole("heading", { name: "Hotel profile" })).toBeVisible();
    await page.locator('input[name="tagline"]').fill("A new tagline");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/sunrise/owner");
    await expect(page.getByText("Hotel profile saved")).toBeVisible();
    expect(backend.calls("PATCH", "/tenant/me")[0].body.tagline).toBe("A new tagline");

    await page.goto("/sunrise/owner/setup");
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL("/sunrise/owner");
  });

  test("an invalid logo file is rejected", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/sunrise/owner/setup");
    await page.locator('input[type="file"]').setInputFiles({ name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
    await expect(page.getByText("Please choose a PNG, JPEG or WebP image.")).toBeVisible();
  });

  test("a valid logo is previewed and uploaded on save", async ({ page, signIn, backend }) => {
    await signIn("owner");
    await page.goto("/sunrise/owner/setup");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await page.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    await expect(page.getByAltText("Logo preview")).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/sunrise/owner");
    expect(backend.calls("POST", "/tenant/me/logo")[0].body.contentType).toBe("image/png");
  });
});

test.describe("owner console", () => {
  test.beforeEach(async ({ signIn }) => { await signIn("owner"); });

  test("overview shows stats, properties and recent bookings", async ({ page }) => {
    await page.goto("/sunrise/owner");
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), Omar/ })).toBeVisible();
    await expect(page.getByText("My Properties")).toBeVisible();
    await expect(page.getByText("Sunrise Central").first()).toBeVisible();
    await expect(page.getByText("Sunrise Lake").first()).toBeVisible();
  });

  test("sidebar links reach every owner page", async ({ page }) => {
    await page.goto("/sunrise/owner");
    const sidebar = page.locator("aside");
    for (const [label, url] of [["Properties", "/sunrise/owner/properties"], ["Rooms & beds", "/sunrise/owner/rooms"], ["Bookings", "/sunrise/owner/bookings"], ["Team & roles", "/sunrise/users"], ["Hotel profile", "/sunrise/owner/setup"]]) {
      await sidebar.getByRole("link", { name: label }).click();
      await expect(page, label).toHaveURL(url);
    }
  });

  test("'Manage' on a property card opens rooms & beds for that property", async ({ page }) => {
    await page.goto("/sunrise/owner");
    await page.getByRole("article").filter({ hasText: "Sunrise Lake" }).getByRole("link", { name: /Manage/ }).click();
    await expect(page).toHaveURL("/sunrise/owner/rooms?property=12");
    await expect(page.locator("select").first()).toHaveValue("12");
    await expect(page.getByRole("row", { name: /201-A/ })).toBeVisible();
  });

  test("Team & roles keeps the owner's own sidebar", async ({ page }) => {
    await page.goto("/sunrise/owner");
    await page.locator("aside").getByRole("link", { name: "Team & roles" }).click();
    await expect(page).toHaveURL("/sunrise/users");
    const links = await page.locator("aside nav a").allTextContents();
    expect(links.map((t) => t.trim())).toEqual(["Overview", "Properties", "Rooms & beds", "Bookings", "Guests", "New booking", "Check-in", "Check-out", "Payments", "Invoices", "Refunds", "Staff", "Inventory", "Complaints", "Feedback", "Team & roles", "Reports", "Business intelligence", "Hotel profile", "Settings", "Audit logs", "My account"]);
  });

  test("'Add property' on the overview opens property management", async ({ page }) => {
    await page.goto("/sunrise/owner");
    await page.getByRole("link", { name: /Add property/ }).first().click();
    await expect(page).toHaveURL("/sunrise/owner/properties");
  });

  test("properties: list, add, edit, search and delete", async ({ page, backend }) => {
    await page.goto("/sunrise/owner/properties");
    await expect(page.getByRole("row", { name: /Sunrise Central/ })).toBeVisible();

    // add
    await page.getByRole("button", { name: /Add property/ }).click();
    await page.locator('input[name="name"]').fill("Harbour View");
    await page.locator('input[name="city"]').fill("Goa");
    await page.locator('input[name="state"]').fill("Goa");
    await page.locator('input[name="postalCode"]').fill("403001");
    await page.getByRole("button", { name: "Add property" }).last().click();
    await expect(page.getByText("Property added")).toBeVisible();
    await expect(page.getByRole("row", { name: /Harbour View/ })).toBeVisible();
    expect(backend.calls("POST", "/properties")[0].body).toMatchObject({ name: "Harbour View", slug: "harbour-view", city: "Goa", state: "Goa", postalCode: "403001" });

    // edit
    await page.getByRole("row", { name: /Harbour View/ }).getByRole("button", { name: /Edit/ }).click();
    await page.locator('input[name="city"]').fill("Panaji");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Property updated")).toBeVisible();
    await expect(page.getByRole("row", { name: /Harbour View.*Panaji/ })).toBeVisible();

    // search
    await page.getByPlaceholder("Search…").fill("lake");
    await expect(page.getByRole("row", { name: /Sunrise Lake/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Harbour View/ })).toHaveCount(0);
    await page.getByPlaceholder("Search…").fill("");

    // delete
    await page.getByRole("row", { name: /Harbour View/ }).getByRole("button").last().click();
    await expect(page.getByText("Property removed")).toBeVisible();
    await expect(page.getByRole("row", { name: /Harbour View/ })).toHaveCount(0);
    expect(backend.properties.find((p) => p.name === "Harbour View")).toBeUndefined();
  });

  test("properties: a duplicate name shows the server error", async ({ page }) => {
    await page.goto("/sunrise/owner/properties");
    await page.getByRole("button", { name: /Add property/ }).click();
    await page.locator('input[name="name"]').fill("Sunrise Central");
    await page.locator('input[name="city"]').fill("Pune");
    await page.getByRole("button", { name: "Add property" }).last().click();
    await expect(page.getByText("Property save failed")).toBeVisible();
    await expect(page.getByText("A property with this name already exists")).toBeVisible();
  });

  test("properties: the form needs a name and city; cancel closes the dialog", async ({ page, backend }) => {
    await page.goto("/sunrise/owner/properties");
    await page.getByRole("button", { name: /Add property/ }).click();
    await page.getByRole("button", { name: "Add property" }).last().click();
    expect(backend.calls("POST", "/properties")).toHaveLength(0);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Add property" })).toHaveCount(0);
  });

  test("properties: an empty list shows an empty state", async ({ page, backend }) => {
    backend.properties = [];
    await page.goto("/sunrise/owner/properties");
    await expect(page.getByText("No properties yet")).toBeVisible();
  });

  test("rooms & beds: shows beds of the first room and switches property", async ({ page }) => {
    await page.goto("/sunrise/owner/rooms");
    await expect(page.getByRole("row", { name: /101-A/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /101-B/ })).toContainText("BOOKED");
    await page.locator("select").first().selectOption("12");
    await expect(page.getByRole("row", { name: /201-A/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /101-A/ })).toHaveCount(0);
  });

  test("rooms & beds: add and edit a bed", async ({ page, backend }) => {
    await page.goto("/sunrise/owner/rooms");
    await expect(page.getByRole("row", { name: /101-A/ })).toBeVisible();
    await page.getByRole("button", { name: /Add bed/ }).click();
    await page.locator('input[name="bedCode"]').fill("101-D");
    await page.locator('select[name="position"]').selectOption("LOWER");
    await page.locator('input[name="priceOverride"]').fill("450");
    await page.getByRole("button", { name: "Save bed" }).click();
    await expect(page.getByText("Bed added")).toBeVisible();
    await expect(page.getByRole("row", { name: /101-D/ })).toContainText("₹450");
    expect(backend.calls("POST", "/rooms/101/beds")[0].body).toEqual({ bedCode: "101-D", position: "LOWER", priceOverride: 450 });

    await page.getByRole("row", { name: /101-D/ }).getByRole("button", { name: /Edit/ }).click();
    await page.locator('select[name="status"]').selectOption("MAINTENANCE");
    await page.getByRole("button", { name: "Save bed" }).click();
    await expect(page.getByText("Bed updated")).toBeVisible();
    await expect(page.getByRole("row", { name: /101-D/ })).toContainText("MAINTENANCE");
  });

  test("rooms & beds: a property with no rooms offers 'Add room', then beds can be added", async ({ page, backend }) => {
    backend.rooms[12] = [];
    await page.goto("/sunrise/owner/rooms");
    await page.locator("select").first().selectOption("12");
    await expect(page.getByText("This property has no rooms yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Add bed/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Add room" }).click();
    await page.locator('input[name="roomNumber"]').fill("301");
    await page.locator('input[name="floor"]').fill("3");
    await page.locator('select[name="genderPolicy"]').selectOption("FEMALE");
    await page.locator('input[name="basePrice"]').fill("700");
    await page.locator('input[name="hasAc"]').check();
    await page.getByRole("button", { name: "Save room" }).click();
    await expect(page.getByText("Room added", { exact: true })).toBeVisible();
    expect(backend.calls("POST", "/properties/12/rooms")[0].body).toEqual({ roomNumber: "301", genderPolicy: "FEMALE", hasAc: true, hasAttachedBathroom: false, basePrice: 700, floor: 3 });

    // The new room is selected and now accepts beds.
    await expect(page.locator("select").nth(1)).toHaveValue(backend.rooms[12][0].id);
    await page.getByRole("button", { name: /Add bed/ }).click();
    await page.locator('input[name="bedCode"]').fill("301-A");
    await page.locator('input[name="priceOverride"]').fill("700");
    await page.getByRole("button", { name: "Save bed" }).click();
    await expect(page.getByRole("row", { name: /301-A/ })).toBeVisible();
  });

  test("rooms & beds: a duplicate room number shows the server error", async ({ page }) => {
    await page.goto("/sunrise/owner/rooms");
    await page.getByRole("button", { name: "Add room" }).click();
    await page.locator('input[name="roomNumber"]').fill("101");
    await page.locator('input[name="basePrice"]').fill("600");
    await page.getByRole("button", { name: "Save room" }).click();
    await expect(page.getByText("Room save failed")).toBeVisible();
    await expect(page.getByText("Room number already exists")).toBeVisible();
  });

  test("rooms & beds: without any property, 'Add room' is disabled", async ({ page, backend }) => {
    backend.properties = [];
    await page.goto("/sunrise/owner/rooms");
    await expect(page.getByText("Add a property first")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add room" })).toBeDisabled();
  });

  test("modals scroll on short screens so the footer buttons stay reachable", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 450 });
    await page.goto("/sunrise/owner/properties");
    await page.getByRole("button", { name: /Add property/ }).click();
    const submit = page.getByRole("button", { name: "Add property" }).last();
    await expect(submit).toBeVisible();
    const box = await submit.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(450);
    await page.locator('input[name="name"]').fill("Tall Modal Inn");
    await page.locator('input[name="city"]').fill("Pune");
    await submit.click();
    await expect(page.getByText("Property added")).toBeVisible();
  });

  test("owner bookings: lists and approves a pending booking", async ({ page, backend }) => {
    await page.goto("/sunrise/owner/bookings");
    const row = page.getByRole("row", { name: /ROOST-0001/ });
    await expect(row).toContainText("PENDING");
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Booking approved")).toBeVisible();
    await expect(row).toContainText("CONFIRMED");
    expect(backend.bookings[0].status).toBe("CONFIRMED");
  });

  test("owner bookings: an approval failure is reported", async ({ page }) => {
    await page.route("**/api/v1/bookings/*/approve", (route) => route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ success: false, message: "Already handled" }) }));
    await page.goto("/sunrise/owner/bookings");
    await page.getByRole("row", { name: /ROOST-0001/ }).getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Approval failed")).toBeVisible();
    await expect(page.getByText("Already handled")).toBeVisible();
  });
});

test.describe("owner team management", () => {
  test("owner can add a staff member and suspend them", async ({ page, signIn, backend }) => {
    await signIn("owner");
    await page.goto("/sunrise/users");
    await expect(page.getByRole("row", { name: /Mia Manager/ })).toBeVisible();
    await page.getByLabel("Name").fill("Tina Temp");
    await page.getByLabel("Email").fill("tina@sunrise.test");
    await page.getByLabel("Role").selectOption("RECEPTIONIST");
    await page.getByLabel("Temporary password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("User created")).toBeVisible();
    await expect(page.getByRole("row", { name: /Tina Temp/ })).toBeVisible();
    expect(backend.calls("POST", "/management/users")[0].body).toMatchObject({ name: "Tina Temp", email: "tina@sunrise.test", role: "RECEPTIONIST" });

    await page.getByRole("row", { name: /Tina Temp/ }).getByRole("button", { name: "Suspend" }).click();
    await expect(page.getByText("Status updated")).toBeVisible();
    await expect(page.getByRole("row", { name: /Tina Temp/ }).getByRole("button", { name: "Activate" })).toBeVisible();
  });

  test("the owner role cannot be assigned by an owner", async ({ page, signIn }) => {
    await signIn("owner");
    await page.goto("/sunrise/users");
    await expect(page.getByLabel("Role")).toBeVisible();
    const options = await page.getByLabel("Role").locator("option").allTextContents();
    expect(options).toEqual(["STAFF", "RECEPTIONIST", "MANAGER"]);
  });
});

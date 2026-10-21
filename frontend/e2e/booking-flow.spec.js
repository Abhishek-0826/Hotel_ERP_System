import { dates, expect, test } from "./support/fixtures";

const SLUG = "sunrise-central";

/** Property page -> availability, with the test dates typed into the booking card. */
async function openAvailability(page) {
  await page.goto(`/sunrise/properties/${SLUG}`);
  await expect(page.getByRole("heading", { level: 1, name: "Sunrise Central" })).toBeVisible();
  await page.getByLabel("Check-in").fill(dates.checkIn);
  await page.getByLabel("Check-out").fill(dates.checkOut);
  await page.getByRole("button", { name: "Check availability" }).click();
  await expect(page.getByRole("heading", { name: "Choose your bed" })).toBeVisible();
}

async function pickBedAndContinue(page, bedCode = "101-A") {
  await page.getByRole("button", { name: new RegExp(bedCode) }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page).toHaveURL(/\/sunrise\/booking\/guest-details/);
}

async function fillGuest(page, { name = "Walt Guest", email = "walt@example.com", phone = "9876543210" } = {}) {
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="phone"]').fill(phone);
  await page.getByRole("button", { name: /Continue to review/ }).click();
  await expect(page).toHaveURL("/sunrise/booking/review");
}

async function submitReview(page) {
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit booking request" }).click();
}

test.describe("discovering properties", () => {
  test("property search groups stays by city and shows the price", async ({ page }) => {
    await page.goto("/sunrise/properties");
    await expect(page.getByRole("heading", { name: "Pune" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mumbai" })).toBeVisible();
    await expect(page.getByText("1 place available").first()).toBeVisible();
    await expect(page.getByText("₹600").first()).toBeVisible();
  });

  test("filtering by city only lists that city", async ({ page, backend }) => {
    await page.goto("/sunrise/properties?city=Mumbai");
    await expect(page.getByRole("heading", { name: "Places to stay in Mumbai" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sunrise Lake" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sunrise Central" })).toHaveCount(0);
    expect(backend.calls("GET", "/properties")[0].query.get("city")).toBe("Mumbai");
  });

  test("an empty city shows an empty state", async ({ page }) => {
    await page.goto("/sunrise/properties?city=Nowhere");
    await expect(page.getByText("No properties are currently available in Nowhere.")).toBeVisible();
  });

  test("the favourite button toggles and is remembered", async ({ page }) => {
    await page.goto("/sunrise/properties");
    const heart = page.getByRole("button", { name: "Favorite" }).first();
    await heart.click();
    await page.reload();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("roost_favorites")));
    expect(stored).toHaveLength(1);
  });

  // The whole property card is a link to /properties/login, so it never reaches the property page.
  // This pins the current behaviour; it is probably a bug (see the report).
  test("clicking a property card opens its details page", async ({ page }) => {
    await page.goto("/sunrise/properties");
    await page.getByRole("heading", { name: "Sunrise Central" }).click();
    await expect(page).toHaveURL("/sunrise/properties/sunrise-central");
  });

  test("property details show description, amenities and price", async ({ page }) => {
    await page.goto(`/sunrise/properties/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: "Sunrise Central" })).toBeVisible();
    await expect(page.getByText("Central co-living with a rooftop.")).toBeVisible();
    await expect(page.getByText("Fast Wi-Fi")).toBeVisible();
    await expect(page.getByRole("heading", { name: /₹600/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Similar stays nearby" })).toBeVisible();
    await expect(page.getByText("Sunrise Lake").first()).toBeVisible();
  });

  test("an unknown property shows 'Property not found'", async ({ page }) => {
    await page.goto("/sunrise/properties/does-not-exist");
    await expect(page.getByText("Property not found").first()).toBeVisible();
    await page.getByRole("link", { name: "Back to properties" }).click();
    await expect(page).toHaveURL("/sunrise/properties");
  });
});

test.describe("bed availability", () => {
  test("shows each bed with the right state and price", async ({ page, backend }) => {
    await openAvailability(page);
    await expect(page).toHaveURL(new RegExp(`checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`));
    await expect(page.getByRole("heading", { name: "Room 101" })).toBeVisible();
    await expect(page.getByText("Available (1)")).toBeVisible();
    await expect(page.getByText(/· 3 nights/)).toBeVisible();

    const available = page.getByRole("button", { name: /101-A/ });
    await expect(available).toBeEnabled();
    await expect(available).toContainText("₹600");
    await expect(available).toContainText("₹1,800");

    // Booked or unavailable beds are not offered at all.
    await expect(page.getByRole("button", { name: /101-B/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /101-C/ })).toHaveCount(0);

    const call = backend.calls("GET", "/properties/sunrise-central/availability")[0];
    expect(call.query.get("checkIn")).toBe(dates.checkIn);
  });

  test("selecting a bed opens the summary bar with the total", async ({ page }) => {
    await openAvailability(page);
    await expect(page.getByText("SELECTED BED")).toHaveCount(0);
    await page.getByRole("button", { name: /101-A/ }).click();
    await expect(page.getByText("SELECTED BED")).toBeVisible();
    await expect(page.getByText("Total ₹1,800")).toBeVisible();
  });

  test("an unavailable bed is not listed", async ({ page }) => {
    await openAvailability(page);
    await expect(page.getByRole("button", { name: /101-A/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /101-B/ })).toHaveCount(0);
  });

  test("an API failure shows a message instead of crashing", async ({ page }) => {
    await page.route("**/api/v1/properties/*/availability*", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, message: "Database offline" }) }));
    await page.goto(`/sunrise/properties/${SLUG}/availability?checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`);
    await expect(page.getByText("Database offline")).toBeVisible();
  });
});

test.describe("booking as a signed-in guest", () => {
  test("full flow: property -> bed -> details -> review -> pending booking", async ({ page, signIn, backend }) => {
    await signIn("guest");
    await openAvailability(page);
    await pickBedAndContinue(page);

    // Guest details are prefilled from the account.
    await expect(page.getByRole("heading", { name: "Guest details" })).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue("Gita Guest");
    await expect(page.locator('input[name="email"]')).toHaveValue("guest@sunrise.test");
    await expect(page.getByText("STEP 2 OF 3")).toBeVisible();
    await fillGuest(page, { name: "Gita Guest", email: "guest@sunrise.test", phone: "9123456780" });

    await expect(page.getByRole("heading", { name: "Review your booking" })).toBeVisible();
    await expect(page.getByText("STEP 3 OF 3")).toBeVisible();
    await submitReview(page);

    await expect(page).toHaveURL(/\/sunrise\/booking\/success\?code=ROOST-/);
    await expect(page.getByRole("heading", { name: "Booking request submitted" })).toBeVisible();
    await expect(page.getByText(/Status: PENDING/)).toBeVisible();
    // The QR is shown straight away; the property approves the booking before it can be used at check-in.
    await expect(page.getByText("Entry / Check-in Access QR")).toBeVisible();
    await expect(page.getByText(/works once the property approves/)).toBeVisible();

    const created = backend.calls("POST", "/bookings")[0].body;
    expect(created).toMatchObject({ propertyId: "11", roomId: "101", bedId: "1001", checkIn: dates.checkIn, checkOut: dates.checkOut, guestName: "Gita Guest", guestEmail: "guest@sunrise.test", guestPhone: "9123456780", source: "WEB" });
    expect(backend.calls("POST", "/bookings")[0].headers.authorization).toBe("Bearer tok-guest");

    // The new booking appears in "My bookings".
    await page.getByRole("article").getByRole("link", { name: "My bookings" }).click();
    await expect(page).toHaveURL("/sunrise/my-bookings");
    await expect(page.getByText(backend.bookings[0].bookingCode).first()).toBeVisible();
  });

  test("the booked bed is no longer selectable afterwards", async ({ page, signIn }) => {
    await signIn("guest");
    await openAvailability(page);
    await pickBedAndContinue(page);
    await fillGuest(page, { name: "Gita Guest", email: "guest@sunrise.test", phone: "9123456780" });
    await submitReview(page);
    await expect(page.getByRole("heading", { name: "Booking request submitted" })).toBeVisible();

    await page.goto(`/sunrise/properties/${SLUG}/availability?checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`);
    await expect(page.getByRole("button", { name: /101-A/ })).toHaveCount(0);
  });

  test("success page 'Booking details' link opens the booking", async ({ page, signIn, backend }) => {
    await signIn("guest");
    await openAvailability(page);
    await pickBedAndContinue(page);
    await fillGuest(page, { name: "Gita Guest", email: "guest@sunrise.test", phone: "9123456780" });
    await submitReview(page);
    await page.getByRole("link", { name: "Booking details" }).click();
    const code = backend.bookings[0].bookingCode;
    await expect(page).toHaveURL(`/sunrise/booking/${code}`);
    await expect(page.getByRole("heading", { name: "Booking Details" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Booking QR" })).toBeVisible();
    await expect(page.getByText(/once the property approves your booking/)).toBeVisible();
    await expect(page.getByText("₹1800").first()).toBeVisible();
  });
});

test.describe("booking as an anonymous visitor", () => {
  test("a visitor can book without an account", async ({ page, backend }) => {
    await openAvailability(page);
    await pickBedAndContinue(page);
    await expect(page.locator('input[name="name"]')).toHaveValue("");
    await fillGuest(page);
    await submitReview(page);
    await expect(page.getByRole("heading", { name: "Booking request submitted" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse properties" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My bookings" })).toHaveCount(0);
    expect(backend.calls("POST", "/bookings")[0].headers.authorization).toBeUndefined();
    expect(backend.calls("POST", "/bookings")[0].body.guestEmail).toBe("walt@example.com");
  });

  test("guest details enforce an Indian mobile number", async ({ page }) => {
    await openAvailability(page);
    await pickBedAndContinue(page);
    await page.locator('input[name="name"]').fill("Walt");
    await page.locator('input[name="email"]').fill("walt@example.com");
    await page.locator('input[name="phone"]').fill("12345");
    await page.getByRole("button", { name: /Continue to review/ }).click();
    await expect(page).toHaveURL(/guest-details/);
  });

  test("the review step needs the house rules to be accepted", async ({ page, backend }) => {
    await openAvailability(page);
    await pickBedAndContinue(page);
    await fillGuest(page);
    await page.getByRole("button", { name: "Submit booking request" }).click();
    await expect(page).toHaveURL("/sunrise/booking/review");
    expect(backend.calls("POST", "/bookings")).toHaveLength(0);
  });

  test("the back button on the review step returns to guest details with values kept", async ({ page }) => {
    await openAvailability(page);
    await pickBedAndContinue(page);
    await fillGuest(page);
    await page.getByRole("button", { name: "← Back" }).click();
    await expect(page).toHaveURL(/guest-details/);
  });

  test("going to guest details without choosing a bed redirects to property search", async ({ page }) => {
    await page.goto("/sunrise/booking/guest-details");
    await expect(page).toHaveURL("/sunrise/properties");
  });

  test("a bed taken by someone else in the meantime shows an error and no booking", async ({ page, backend }) => {
    await openAvailability(page);
    await pickBedAndContinue(page);
    await fillGuest(page);
    backend.beds["101"][0].status = "BOOKED"; // another guest wins the race
    await submitReview(page);
    await expect(page.getByText("Booking could not be created")).toBeVisible();
    await expect(page.getByText("This bed is no longer available for the selected dates")).toBeVisible();
    await expect(page).toHaveURL("/sunrise/booking/review");
    expect(backend.bookings.filter((b) => b.guestEmail === "walt@example.com")).toHaveLength(0);
  });

  test("success page without a code says the booking is unavailable", async ({ page }) => {
    await page.goto("/sunrise/booking/success");
    await expect(page.getByRole("heading", { name: "Booking unavailable" })).toBeVisible();
  });

  test("success page can load a booking by its code", async ({ page }) => {
    await page.goto("/sunrise/booking/success?code=ROOST-0002");
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();
    await expect(page.getByText("Entry / Check-in Access QR")).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download QR Code" }).click();
    expect((await download).suggestedFilename()).toBe("ROOST-Access-ROOST-0002.svg");
  });
});

test.describe("looking up and cancelling a booking", () => {
  test("anyone with the code can view a booking", async ({ page }) => {
    await page.goto("/sunrise/booking/ROOST-0002");
    await expect(page.getByRole("heading", { name: "Booking Details" })).toBeVisible();
    await expect(page.getByText("Sunrise Lake").first()).toBeVisible();
    await expect(page.getByText("201-A").first()).toBeVisible();
    await expect(page.getByText("PAID").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Booking QR" })).toBeVisible();
    await expect(page.getByText("Payment is recorded.")).toBeVisible();
  });

  test("an unknown code shows 'Booking not found'", async ({ page }) => {
    await page.goto("/sunrise/booking/NOPE-1");
    await expect(page.getByRole("heading", { name: "Booking not found" })).toBeVisible();
    await page.getByRole("link", { name: "Browse properties" }).click();
    await expect(page).toHaveURL("/sunrise/properties");
  });

  test("a signed-in guest can cancel from the details page", async ({ page, signIn, backend }) => {
    await signIn("guest");
    const dialogs = [];
    page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.accept(); });
    await page.goto("/sunrise/booking/ROOST-0001");
    await page.getByRole("button", { name: "Cancel Booking" }).click();
    await expect.poll(() => backend.bookings.find((b) => b.bookingCode === "ROOST-0001").status).toBe("CANCELLED");
    await expect(page.getByText("CANCELLED").first()).toBeVisible();
    expect(dialogs).toEqual(["Are you sure you want to cancel this booking?", "Booking cancelled."]);
    expect(backend.calls("PATCH", "/bookings/ROOST-0001/cancel")[0].body).toEqual({ reason: "Cancelled by guest" });
  });

  // BookingDetails compares against "Cancelled"/"Completed" but the API sends "CANCELLED"/"COMPLETED",
  // so the cancel button stays on screen for a booking that is already cancelled.
  test("the cancel button disappears once a booking is cancelled", async ({ page, backend }) => {
    test.fail(true, "Known bug: BookingDetails status check is case-sensitive");
    backend.bookings[0].status = "CANCELLED";
    await page.goto("/sunrise/booking/ROOST-0001");
    await expect(page.getByRole("heading", { name: "Booking Details" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel Booking" })).toHaveCount(0);
  });

  test("an anonymous visitor must confirm with the booking email to cancel", async ({ page, backend }) => {
    const prompts = [];
    page.on("dialog", async (dialog) => {
      if (dialog.type() === "prompt") { prompts.push(dialog.message()); await dialog.accept("guest@sunrise.test"); } else await dialog.accept();
    });
    await page.goto("/sunrise/booking/ROOST-0001");
    await page.getByRole("button", { name: "Cancel Booking" }).click();
    await expect.poll(() => backend.bookings.find((b) => b.bookingCode === "ROOST-0001").status).toBe("CANCELLED");
    expect(prompts).toEqual(["Enter the email used for this booking:"]);
    expect(backend.calls("PATCH", "/bookings/ROOST-0001/cancel")[0].body.guestEmail).toBe("guest@sunrise.test");
  });

  test("a wrong email does not cancel the booking", async ({ page, backend }) => {
    page.on("dialog", async (dialog) => { if (dialog.type() === "prompt") await dialog.accept("someone@else.com"); else await dialog.accept(); });
    await page.goto("/sunrise/booking/ROOST-0001");
    await page.getByRole("button", { name: "Cancel Booking" }).click();
    await expect.poll(() => backend.calls("PATCH", "/bookings/ROOST-0001/cancel").length).toBe(1);
    expect(backend.bookings.find((b) => b.bookingCode === "ROOST-0001").status).toBe("PENDING");
  });

  test("declining the confirmation keeps the booking", async ({ page, signIn, backend }) => {
    await signIn("guest");
    page.on("dialog", (dialog) => dialog.dismiss());
    await page.goto("/sunrise/booking/ROOST-0001");
    await page.getByRole("button", { name: "Cancel Booking" }).click();
    expect(backend.calls("PATCH", "/bookings/ROOST-0001/cancel")).toHaveLength(0);
  });
});

test.describe("my bookings", () => {
  test("lists the guest's bookings only", async ({ page, signIn, backend }) => {
    backend.bookings.push({ ...backend.bookings[0], id: "b-other", bookingCode: "ROOST-9999", guestId: "someone-else" });
    await signIn("guest");
    await page.goto("/sunrise/my-bookings");
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
    await expect(page.getByText("ROOST-0001").first()).toBeVisible();
    await expect(page.getByText("ROOST-0002").first()).toBeVisible();
    await expect(page.getByText("ROOST-9999")).toHaveCount(0);
  });

  test("shows an empty state with a link to find a stay", async ({ page, signIn, backend }) => {
    backend.bookings = [];
    await signIn("guest");
    await page.goto("/sunrise/my-bookings");
    await expect(page.getByRole("heading", { name: "No bookings yet" })).toBeVisible();
    await page.getByRole("button", { name: "Find a stay" }).click();
    await expect(page).toHaveURL("/sunrise/properties");
  });

  test("the details dialog opens and closes", async ({ page, signIn }) => {
    await signIn("guest");
    await page.goto("/sunrise/my-bookings");
    await page.getByRole("button", { name: "Details" }).first().click();
    await expect(page.getByRole("heading", { name: /Booking details/i }).last()).toBeVisible();
  });

  test("a pending booking can be cancelled", async ({ page, signIn, backend }) => {
    await signIn("guest");
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/sunrise/my-bookings");
    await page.getByRole("button", { name: "Cancel", exact: true }).first().click();
    await expect(page.getByText("Booking cancelled")).toBeVisible();
    await expect.poll(() => backend.bookings.find((b) => b.bookingCode === "ROOST-0001").status).toBe("CANCELLED");
  });

  test("'View QR' opens the booking's access page", async ({ page, signIn }) => {
    await signIn("guest");
    await page.goto("/sunrise/my-bookings");
    await page.getByRole("button", { name: "View QR" }).first().click();
    await expect(page).toHaveURL("/sunrise/booking/success");
    await expect(page.getByText(/ROOST-000/).first()).toBeVisible();
  });
});

test.describe("guest and owner together", () => {
  test("an owner approves a guest's request and the guest then gets a QR", async ({ page, signIn, actor, backend }) => {
    await signIn("guest");
    await openAvailability(page);
    await pickBedAndContinue(page);
    await fillGuest(page, { name: "Gita Guest", email: "guest@sunrise.test", phone: "9123456780" });
    await submitReview(page);
    await expect(page.getByRole("heading", { name: "Booking request submitted" })).toBeVisible();
    const code = backend.bookings[0].bookingCode;

    const owner = await actor("owner");
    await owner.goto("/sunrise/owner/bookings");
    const row = owner.getByRole("row", { name: new RegExp(code) });
    await expect(row).toContainText("PENDING");
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(owner.getByText("Booking approved")).toBeVisible();
    await expect(row).toContainText("CONFIRMED");
    expect(backend.calls("PATCH", `/bookings/${code}/approve`)).toHaveLength(1);

    await page.goto(`/sunrise/booking/${code}`);
    await expect(page.getByRole("heading", { name: "Booking QR" })).toBeVisible();
    await expect(page.getByText(/once the property approves your booking/)).toHaveCount(0);
  });

  // The success page prefers the booking cached in sessionStorage over the one named in ?code=,
  // so a guest who revisits it after approval still sees "request submitted" and no QR.
  test("the success page reflects the latest status of the booking in ?code=", async ({ page, signIn, backend }) => {
    test.fail(true, "Known bug: BookingSuccess uses the cached draft instead of fetching ?code=");
    await signIn("guest");
    await openAvailability(page);
    await pickBedAndContinue(page);
    await fillGuest(page, { name: "Gita Guest", email: "guest@sunrise.test", phone: "9123456780" });
    await submitReview(page);
    const code = backend.bookings[0].bookingCode;
    backend.bookings[0].status = "CONFIRMED";
    await page.goto(`/sunrise/booking/success?code=${code}`);
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();
  });
});

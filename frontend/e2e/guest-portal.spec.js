import { expect, test } from "./support/fixtures";

test.describe("guest portal", () => {
  test.beforeEach(async ({ signIn }) => { await signIn("guest"); });

  test("dashboard shows the active booking and payment summary", async ({ page }) => {
    await page.goto("/sunrise/dashboard");
    await expect(page.getByRole("heading", { name: "Welcome, Gita Guest" })).toBeVisible();
    await expect(page.getByText("ROOST-0001").first()).toBeVisible();
    await expect(page.getByText("2 bookings")).toBeVisible();
    await expect(page.getByText("₹2,400")).toBeVisible(); // only the paid booking counts
    await page.getByRole("link", { name: "View details" }).click();
    await expect(page).toHaveURL("/sunrise/booking/ROOST-0001");
  });

  test("'Book a stay' goes to property search", async ({ page }) => {
    await page.goto("/sunrise/dashboard");
    await page.getByRole("link", { name: /Book a stay/ }).click();
    await expect(page).toHaveURL("/sunrise/properties");
  });

  test("sidebar navigates between portal pages", async ({ page }) => {
    await page.goto("/sunrise/dashboard");
    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: "Payments" }).click();
    await expect(page).toHaveURL("/sunrise/payments");
    await sidebar.getByRole("link", { name: "Complaints" }).click();
    await expect(page).toHaveURL("/sunrise/complaints");
    await sidebar.getByRole("link", { name: "Feedback" }).click();
    await expect(page).toHaveURL("/sunrise/feedback");
    await sidebar.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL("/sunrise/profile");
  });

  test("payments page lists payment status per booking", async ({ page }) => {
    await page.goto("/sunrise/payments");
    await expect(page.getByRole("row", { name: /ROOST-0002/ })).toContainText("PAID");
    await expect(page.getByRole("row", { name: /ROOST-0001/ })).toContainText("UNPAID");
  });

  test("payment detail page points to the property", async ({ page }) => {
    await page.goto("/sunrise/payments/PAY-1");
    await expect(page.getByText("Reference: PAY-1")).toBeVisible();
    await page.getByRole("link", { name: "Back to payments" }).click();
    await expect(page).toHaveURL("/sunrise/payments");
  });

  test("submits a complaint linked to a booking and sees it in the history", async ({ page, backend }) => {
    await page.goto("/sunrise/complaints");
    await expect(page.getByText("No complaints submitted yet.")).toBeVisible();
    await page.getByLabel("Booking").selectOption({ label: "ROOST-0001 · Sunrise Central" });
    await page.getByLabel("Category").selectOption("NOISE");
    await page.getByLabel("Subject").fill("Loud music");
    await page.getByLabel("Description").fill("Music after midnight in the common room");
    await page.getByLabel("Priority").selectOption("High");
    await page.getByRole("button", { name: "Create complaint" }).click();
    await expect(page.getByText("Complaint submitted", { exact: true })).toBeVisible();
    await expect(page.getByText("Loud music")).toBeVisible();
    expect(backend.calls("POST", "/experience/complaints")[0].body).toMatchObject({ bookingId: "b-seed", category: "NOISE", subject: "Loud music", priority: "HIGH" });
  });

  test("a complaint needs a booking, subject and description", async ({ page, backend }) => {
    await page.goto("/sunrise/complaints");
    await page.getByRole("button", { name: "Create complaint" }).click();
    expect(backend.calls("POST", "/experience/complaints")).toHaveLength(0);
  });

  test("submits feedback with a star rating", async ({ page, backend }) => {
    await page.goto("/sunrise/feedback");
    await page.getByLabel("Booking").selectOption({ label: "ROOST-0002 · Sunrise Lake" });
    await page.getByRole("button", { name: "Overall rating 4 stars" }).click();
    await page.getByRole("button", { name: "Cleanliness rating 3 stars" }).click();
    await page.getByRole("button", { name: "Service rating 5 stars" }).click();
    await page.getByRole("button", { name: "Value rating 2 stars" }).click();
    await page.getByLabel("Comments").fill("Lovely stay");
    await page.getByRole("button", { name: "Submit feedback" }).click();
    await expect(page.getByText("Feedback submitted", { exact: true })).toBeVisible();
    expect(backend.calls("POST", "/experience/feedback")[0].body).toEqual({ bookingId: "b-conf", overallRating: 4, cleanlinessRating: 3, serviceRating: 5, valueRating: 2, comment: "Lovely stay" });
  });

  test("feedback defaults to 5 stars and needs a booking", async ({ page, backend }) => {
    await page.goto("/sunrise/feedback");
    await page.getByRole("button", { name: "Submit feedback" }).click();
    expect(backend.calls("POST", "/experience/feedback")).toHaveLength(0);
  });

  test("feedback and complaints are disabled when the guest has no bookings", async ({ page, backend }) => {
    backend.bookings = [];
    await page.goto("/sunrise/feedback");
    await expect(page.getByRole("button", { name: "Submit feedback" })).toBeDisabled();
    await page.goto("/sunrise/complaints");
    await expect(page.getByRole("button", { name: "Create complaint" })).toBeDisabled();
  });

  test("/bookings/:id and /bookings redirect to the right place for guests", async ({ page }) => {
    await page.goto("/sunrise/bookings/ROOST-0002");
    await expect(page).toHaveURL("/sunrise/booking/ROOST-0002");
    await page.goto("/sunrise/bookings/new");
    await expect(page).toHaveURL("/sunrise/properties");
  });

  test("the legacy /user dashboard renders for guests", async ({ page }) => {
    await page.goto("/sunrise/user");
    await expect(page).toHaveURL("/sunrise/user");
    await expect(page.locator("main, #root").first()).toBeVisible();
  });
});

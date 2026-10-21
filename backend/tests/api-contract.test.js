const test = require("node:test");
const assert = require("node:assert/strict");
const { createBookingSchema, cancelBookingSchema } = require("../src/modules/booking/booking.validation");
const { registerSchema } = require("../src/modules/auth/auth.validation");

test("public booking input does not require client-supplied tenant or guest IDs", () => {
  const result = createBookingSchema.safeParse({
    propertyId: "1",
    roomId: "2",
    bedId: "3",
    checkIn: "2099-01-01",
    checkOut: "2099-01-08",
    guestName: "Test Guest",
    guestEmail: "guest@example.com",
    guestPhone: "9876543210",
    source: "WEB",
  });

  assert.equal(result.success, true);
  assert.equal("tenantId" in result.data, false);
});

test("registration enforces the documented password minimum", () => {
  const shortPassword = registerSchema.safeParse({
    name: "Test Guest",
    email: "guest@example.com",
    password: "short",
  });
  const validPassword = registerSchema.safeParse({
    name: "Test Guest",
    email: "guest@example.com",
    password: "LongPassword123!",
  });

  assert.equal(shortPassword.success, false);
  assert.equal(validPassword.success, true);
  const attemptedTenantAssignment = registerSchema.parse({
    name: "Test Guest",
    email: "guest@example.com",
    password: "LongPassword123!",
    tenantId: "99",
  });
  assert.equal("tenantId" in attemptedTenantAssignment, false);
});

test("anonymous cancellation accepts only a valid booking email", () => {
  assert.equal(cancelBookingSchema.safeParse({ reason: "Plans changed", guestEmail: "guest@example.com" }).success, true);
  assert.equal(cancelBookingSchema.safeParse({ reason: "Plans changed", guestEmail: "not-an-email" }).success, false);
});

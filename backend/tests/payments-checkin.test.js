const test = require("node:test");
const assert = require("node:assert/strict");
const { collectPaymentSchema } = require("../src/modules/finance/finance.validation");
const { checkInSchema } = require("../src/modules/reception/reception.validation");

test("a payment can be split between cash and an online method", () => {
  const parsed = collectPaymentSchema.parse({ bookingId: "5", splits: [{ method: "CASH", amount: "300" }, { method: "UPI", amount: 200 }] });
  assert.equal(parsed.splits.length, 2);
  assert.equal(parsed.splits[0].amount, 300);
});

test("a single amount and method is still accepted", () => {
  assert.ok(collectPaymentSchema.safeParse({ bookingId: 5, amount: 100, method: "CASH" }).success);
});

test("a payment needs either splits or an amount with a method", () => {
  assert.equal(collectPaymentSchema.safeParse({ bookingId: 5 }).success, false);
  assert.equal(collectPaymentSchema.safeParse({ bookingId: 5, amount: 100 }).success, false);
  assert.equal(collectPaymentSchema.safeParse({ bookingId: 5, splits: [{ method: "BITCOIN", amount: 10 }] }).success, false);
});

test("check-in ID document type and number must come together", () => {
  assert.ok(checkInSchema.safeParse({}).success);
  assert.ok(checkInSchema.safeParse({ idProofType: "AADHAAR", idProofNumber: "1234 5678 9012" }).success);
  assert.equal(checkInSchema.safeParse({ idProofType: "AADHAAR" }).success, false);
  assert.equal(checkInSchema.safeParse({ idProofNumber: "1234567" }).success, false);
});

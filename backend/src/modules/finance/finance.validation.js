const { z } = require("zod");
const id = z.union([z.string().regex(/^\d+$/), z.number().int().positive()]);
const money = z.coerce.number().positive().max(10000000);
const method = z.enum(["CASH", "UPI", "CARD", "NET_BANKING", "COD"]);
// One entry per instrument used, e.g. part cash + part UPI for the same booking.
const splitSchema = z.object({ method, amount: money, transactionRef: z.string().max(255).optional() });
const collectPaymentSchema = z.object({
  bookingId: id,
  amount: money.optional(),
  method: method.optional(),
  splits: z.array(splitSchema).min(1).max(5).optional(),
  transactionRef: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
}).refine((value) => Boolean(value.splits) || (value.amount && value.method), "Provide an amount and method, or a list of payment splits");
const requestRefundSchema = z.object({ paymentId: id, amount: money, reason: z.string().min(5).max(2000) });
const approveRefundSchema = z.object({ action: z.enum(["APPROVE", "REJECT"]) });
module.exports = { collectPaymentSchema, requestRefundSchema, approveRefundSchema };

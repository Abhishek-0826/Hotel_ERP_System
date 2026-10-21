const service = require("./finance.service");
const handle = (fn, status = 200) => async (req, res, next) => { try { res.status(status).json({ success: true, data: await fn(req) }); } catch (error) { next(error); } };
module.exports = {
  collectPayment: handle((req) => service.collectPayment(req.user.tenantId, req.body, req.user, req), 201),
  listPayments: handle((req) => service.listPayments(req.user.tenantId, req.query)),
  getInvoice: handle((req) => service.getInvoice(req.user.tenantId, req.params.invoiceNumber)),
  requestRefund: handle((req) => service.requestRefund(req.user.tenantId, req.body, req.user, req), 201),
  decideRefund: handle((req) => service.decideRefund(req.user.tenantId, req.params.refundId, req.body.action, req.user, req)),
};

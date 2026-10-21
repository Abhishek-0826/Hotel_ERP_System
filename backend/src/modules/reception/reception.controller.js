const service = require("./reception.service");
const tenantId = (req) => req.user.tenantId;
const handler = (fn, status = 200) => async (req, res, next) => { try { res.status(status).json({ success: true, data: await fn(req) }); } catch (error) { next(error); } };
module.exports = {
  registerGuest: handler((req) => service.registerGuest(tenantId(req), req.body, req.user, req), 201),
  searchGuests: handler((req) => service.searchGuests(tenantId(req), req.query.search)),
  availability: handler((req) => service.getAvailability(tenantId(req), req.params.propertyId, req.query.checkIn, req.query.checkOut)),
  createBooking: handler((req) => service.createBooking(tenantId(req), req.body, req.user, req), 201),
  getBooking: handler((req) => service.getBookingForCheckIn(tenantId(req), req.params.bookingCode)),
  checkIn: handler((req) => service.checkIn(tenantId(req), req.params.bookingCode, req.body, req.user, req)),
  occupancy: handler((req) => service.getOccupancy(tenantId(req), req.params.propertyId)),
  dashboard: handler((req) => service.getDashboard(tenantId(req))),
  checkOut: handler((req) => service.checkOut(tenantId(req), req.params.bookingCode, req.user, req)),
};

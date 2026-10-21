const service = require("./management.service");

const handle = (fn, status = 200) => async (req, res, next) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (error) {
    next(error);
  }
};

const readTenantFilter = (req) => {
  if (req.query.tenantId === undefined) return undefined;
  if (!/^\d+$/.test(String(req.query.tenantId))) {
    const error = new Error("Tenant ID must be a positive numeric ID");
    error.status = 400;
    error.code = "INVALID_ID";
    throw error;
  }
  return req.query.tenantId;
};

module.exports = {
  // Legacy tenant-scoped management APIs.
  createUser: handle((req) => service.createUser(req.user.tenantId, req.body, req.user, req), 201),
  listUsers: handle((req) => service.listUsers(req.user.tenantId, req.query.role)),
  updateUserStatus: handle((req) => service.updateUserStatus(req.user.tenantId, req.params.userId, req.body.status, req.user, req)),

  resetUserPassword: handle((req) => service.resetUserPassword(req.user.tenantId, req.params.userId, req.body.temporaryPassword, req.user, req)),
  deleteUser: handle((req) => service.deleteUser(req.user.tenantId, req.params.userId, req.user, req)),

  // Frontend-facing platform administration APIs.
  createPlatformUser: handle((req) => service.createUser(null, req.body, req.user, req), 201),
  listPlatformUsers: handle((req) => service.listUsers(null, req.query.role, {
    allTenants: true,
    requestedTenantId: readTenantFilter(req),
  })),
  updatePlatformUser: handle((req) => service.updateUser(null, req.params.userId, req.body, req.user, req, { allTenants: true })),
  resetPlatformUserPassword: handle((req) => service.resetUserPassword(null, req.params.userId, req.body.temporaryPassword, req.user, req, { allTenants: true })),
  deletePlatformUser: handle((req) => service.deleteUser(null, req.params.userId, req.user, req, { allTenants: true })),
  activatePlatformUser: handle((req) => service.updateUserStatus(null, req.params.userId, "ACTIVE", req.user, req, { allTenants: true })),
  deactivatePlatformUser: handle((req) => service.updateUserStatus(null, req.params.userId, "INACTIVE", req.user, req, { allTenants: true })),

  createItem: handle((req) => service.createItem(req.user.tenantId, req.body, req.user, req), 201),
  listItems: handle((req) => service.listItems(req.user.tenantId, req.query.propertyId)),
  adjustStock: handle((req) => service.adjustStock(req.user.tenantId, req.params.itemId, req.body, req.user, req)),
  stockHistory: handle((req) => service.stockHistory(req.user.tenantId, req.params.itemId)),
};

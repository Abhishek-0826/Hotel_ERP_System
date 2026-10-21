/* ─────────────────────────────────────────────────────────────────────────
   src/modules/analytics/analytics.controller.js
───────────────────────────────────────────────────────────────────────── */

const analyticsService = require("./analytics.service");

const ownerSummary = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      const err = new Error("User is not associated with a tenant");
      err.status = 400;
      err.code = "TENANT_REQUIRED";
      throw err;
    }

    const data = await analyticsService.getOwnerSummary(tenantId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  ownerSummary,
};  
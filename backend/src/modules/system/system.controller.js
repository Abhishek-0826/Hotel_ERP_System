'use strict';

const service = require('./system.service');

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Extract the tenant ID from the authenticated user, supporting both casing styles. */
const tenantId = (req) => req.user.tenantId ?? req.user.tenant_id ?? null;

/** Extract the user ID from the authenticated user. */
const userId = (req) => req.user.id ?? req.user.userId;

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/system/access-control
 * Returns the permission map (any authenticated user).
 */
async function getAccessControl(req, res, next) {
  try {
    const data = await service.getAccessControl();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/system/settings
 * Returns all settings for the tenant grouped by category.
 */
async function getSettings(req, res, next) {
  try {
    const data = await service.getSettings(tenantId(req));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/system/settings
 * Bulk-upserts settings for the tenant.
 * Body: { settings: [{ key, value, category? }] }
 */
async function updateSettings(req, res, next) {
  try {
    const data = await service.updateSettings(
      req.body.settings,
      tenantId(req),
      userId(req),
      req
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/system/camera
 * Returns camera configuration settings for the tenant.
 */
async function getCameraConfig(req, res, next) {
  try {
    const data = await service.getCameraConfig(tenantId(req));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/system/camera
 * Upserts camera configuration settings.
 * Body: { enabled, streamUrl?, recordingEnabled? }
 */
async function updateCameraConfig(req, res, next) {
  try {
    const data = await service.updateCameraConfig(
      req.body,
      tenantId(req),
      userId(req),
      req
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/system/backup
 * Returns backup configuration and status.
 */
async function getBackupInfo(req, res, next) {
  try {
    const data = await service.getBackupInfo(tenantId(req));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/system/restore
 * Records a backup restore request for operator review.
 */
async function restoreBackup(req, res, next) {
  try {
    const data = await service.restoreBackup(tenantId(req), userId(req), req);
    return res.status(202).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/system/audit-logs
 * Returns paginated audit logs with optional filters.
 *
 * Query params: userId, entityType, action, from, to, page, limit
 */
async function getAuditLogs(req, res, next) {
  try {
    const {
      userId: filterUserId,
      entityType,
      action,
      from,
      to,
      page,
      limit,
    } = req.query;

    const data = await service.getAuditLogs(tenantId(req), {
      userId    : filterUserId,
      entityType,
      action,
      from,
      to,
      page,
      limit,
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAccessControl,
  getSettings,
  updateSettings,
  getCameraConfig,
  updateCameraConfig,
  getBackupInfo,
  restoreBackup,
  getAuditLogs,
};

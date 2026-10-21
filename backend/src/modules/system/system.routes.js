'use strict';

const { Router }            = require('express');
const { authenticate }      = require('../../middleware/auth');
const { requirePermission } = require('../../common/rbac');
const validate              = require('../../middleware/validate');

const {
  updateSettingsSchema,
  cameraConfigSchema,
} = require('./system.validation');

const ctrl = require('./system.controller');

const router = Router();

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/system/access-control
 * Returns the permission→roles map. Any authenticated user may call this.
 */
router.get(
  '/access-control',
  authenticate,
  ctrl.getAccessControl
);

/**
 * GET /api/system/settings
 * Returns all settings grouped by category.
 */
router.get(
  '/settings',
  authenticate,
  requirePermission('settings:read'),
  ctrl.getSettings
);

/**
 * PUT /api/system/settings
 * Bulk-upserts system settings.
 * Body: { settings: [{ key, value, category? }] }
 */
router.put(
  '/settings',
  authenticate,
  requirePermission('settings:write'),
  validate(updateSettingsSchema),
  ctrl.updateSettings
);

// PATCH is the public contract; PUT remains supported for older clients.
router.patch(
  '/settings',
  authenticate,
  requirePermission('settings:write'),
  validate(updateSettingsSchema),
  ctrl.updateSettings
);

/**
 * GET /api/system/camera
 * Returns camera configuration.
 */
router.get(
  '/camera',
  authenticate,
  requirePermission('settings:read'),
  ctrl.getCameraConfig
);

/**
 * PUT /api/system/camera
 * Updates camera configuration.
 * Body: { enabled, streamUrl?, recordingEnabled? }
 */
router.put(
  '/camera',
  authenticate,
  requirePermission('settings:write'),
  validate(cameraConfigSchema),
  ctrl.updateCameraConfig
);

/**
 * GET /api/system/backup
 * Returns backup configuration and status info.
 */
router.get(
  '/backup',
  authenticate,
  requirePermission('settings:read'),
  ctrl.getBackupInfo
);

/**
 * POST /api/system/restore
 * Records a backup restore request for operator review.
 */
router.post(
  '/restore',
  authenticate,
  requirePermission('settings:write'),
  ctrl.restoreBackup
);

/**
 * GET /api/system/audit-logs
 * Returns paginated audit logs.
 * Query: userId, entityType, action, from, to, page, limit
 */
router.get(
  '/audit-logs',
  authenticate,
  requirePermission('audit:read'),
  ctrl.getAuditLogs
);

module.exports = router;

'use strict';

const prisma = require('../../config/db');
const { ROLE_PERMISSIONS } = require('../../common/rbac');
const { recordAudit } = require('../../common/audit.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely cast tenantId to BigInt, or null for platform-level settings. */
const toBigInt = (id) => (id ? BigInt(id) : null);

/**
 * Build the "tenant_id = X OR tenant_id IS NULL" Prisma where clause.
 * Tenant-specific rows shadow global (null) rows once deduplicated.
 */
const tenantOrGlobal = (tenantId) => ({
  OR: [{ tenant_id: toBigInt(tenantId) }, { tenant_id: null }],
});

// ─── Service Functions ─────────────────────────────────────────────────────────

/**
 * Returns a description of the full permission map along with the distinct
 * roles defined across all permissions.
 *
 * @returns {{ roles: string[], permissions: Record<string, string[]> }}
 */
async function getAccessControl() {
  const roles = Object.keys(ROLE_PERMISSIONS).sort();
  return { roles, permissions: ROLE_PERMISSIONS };
}

/**
 * Fetch all system_settings visible to a tenant (tenant-specific + global).
 * Returns results grouped by category as a map: { CATEGORY: { key: value, … }, … }.
 *
 * @param {string|number} tenantId
 * @returns {Record<string, Record<string, string>>}
 */
async function getSettings(tenantId) {
  const rows = await prisma.system_settings.findMany({
    where  : tenantOrGlobal(tenantId),
    orderBy: [{ tenant_id: 'desc' }, { setting_key: 'asc' }],
  });

  // Deduplicate: tenant-specific row wins over global row for same key
  const seen    = new Map();
  const grouped = {};
  const updatedAt = {};

  for (const row of rows) {
    if (seen.has(row.setting_key)) continue;
    seen.set(row.setting_key, true);

    const cat = row.category || 'GENERAL';
    if (!grouped[cat]) grouped[cat] = {};
    grouped[cat][row.setting_key] = row.setting_value;
    updatedAt[row.setting_key] = row.updated_at;
  }

  // `_meta` is not a category: it tells the UI when each key was last saved.
  grouped._meta = { updatedAt };
  return grouped;
}

/**
 * Upsert an array of settings for a tenant.
 * Each item: { key, value, category? }
 *
 * @param {{ key: string, value: string, category?: string }[]} settings
 * @param {string|number} tenantId
 * @param {string|number} updatedBy  - userId of the actor
 * @param {import('express').Request} req
 * @returns {{ updatedCount: number }}
 */
async function updateSettings(settings, tenantId, updatedBy, req) {
  const tid = toBigInt(tenantId);

  await prisma.$transaction(async (tx) => {
    for (const setting of settings) {
      const existing = await tx.system_settings.findFirst({
        where: { tenant_id: tid, setting_key: setting.key },
      });
      const data = {
        setting_value: setting.value,
        ...(setting.category ? { category: setting.category } : {}),
        updated_at: new Date(),
      };
      if (existing) await tx.system_settings.update({ where: { id: existing.id }, data });
      else await tx.system_settings.create({
        data: { tenant_id: tid, setting_key: setting.key, category: setting.category || 'GENERAL', ...data },
      });
    }
  });

  await recordAudit({
    tenantId,
    userId    : updatedBy,
    action    : 'SETTINGS_UPDATED',
    entityType: 'SYSTEM_SETTINGS',
    entityId  : null,
    newValues : { updatedKeys: settings.map((s) => s.key) },
    req,
  });

  return { updatedCount: settings.length };
}

/**
 * Fetch camera-related settings for a tenant, returned as a structured object.
 *
 * @param {string|number} tenantId
 * @returns {{ enabled: boolean, streamUrl: string|null, recordingEnabled: boolean }}
 */
async function getCameraConfig(tenantId) {
  const rows = await prisma.system_settings.findMany({
    where  : { ...tenantOrGlobal(tenantId), category: 'CAMERA' },
    orderBy: [{ tenant_id: 'desc' }],
  });

  const map = {};
  for (const row of rows) {
    if (!(row.setting_key in map)) map[row.setting_key] = row.setting_value;
  }

  return {
    enabled          : map['camera.enabled'] === 'true',
    streamUrl        : map['camera.streamUrl'] ?? null,
    recordingEnabled : map['camera.recordingEnabled'] === 'true',
  };
}

/**
 * Upsert camera configuration settings.
 *
 * @param {{ enabled: boolean, streamUrl?: string, recordingEnabled?: boolean }} config
 * @param {string|number} tenantId
 * @param {string|number} updatedBy
 * @param {import('express').Request} req
 * @returns {{ success: boolean }}
 */
async function updateCameraConfig(config, tenantId, updatedBy, req) {
  const tid = toBigInt(tenantId);

  const cameraSettings = [
    { key: 'camera.enabled', value: String(config.enabled) },
  ];

  if (config.streamUrl !== undefined) {
    cameraSettings.push({ key: 'camera.streamUrl', value: config.streamUrl });
  }

  if (config.recordingEnabled !== undefined) {
    cameraSettings.push({
      key  : 'camera.recordingEnabled',
      value: String(config.recordingEnabled),
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const setting of cameraSettings) {
      const existing = await tx.system_settings.findFirst({
        where: { tenant_id: tid, setting_key: setting.key },
      });
      const data = { setting_value: setting.value, category: 'CAMERA', updated_at: new Date() };
      if (existing) await tx.system_settings.update({ where: { id: existing.id }, data });
      else await tx.system_settings.create({ data: { tenant_id: tid, setting_key: setting.key, ...data } });
    }
  });

  await recordAudit({
    tenantId,
    userId    : updatedBy,
    action    : 'CAMERA_CONFIG_UPDATED',
    entityType: 'SYSTEM_SETTINGS',
    entityId  : null,
    newValues : config,
    req,
  });

  return { success: true };
}

/**
 * Retrieve backup-related settings and return them as a structured object.
 * @param {string|number} tenantId
 * @returns {{ backupEnabled: boolean, backupFrequency: string|null, lastBackupAt: string|null }}
 */
async function getBackupInfo(tenantId) {
  const rows = await prisma.system_settings.findMany({
    where  : { ...tenantOrGlobal(tenantId), category: 'BACKUP' },
    orderBy: [{ tenant_id: 'desc' }],
  });

  const map = {};
  for (const row of rows) {
    if (!(row.setting_key in map)) map[row.setting_key] = row.setting_value;
  }

  return {
    backupEnabled   : map['backup.enabled'] === 'true',
    backupFrequency : map['backup.frequency'] ?? null,
    lastBackupAt    : map['backup.lastCompletedAt'] ?? null,
  };
}

/**
 * Record a restore request for an operator. Restores are intentionally not
 * executed inside the web process.
 *
 * @param {string|number} tenantId
 * @param {string|number} updatedBy
 * @param {import('express').Request} req
 * @returns {{ accepted: boolean, message: string }}
 */
async function restoreBackup(tenantId, updatedBy, req) {
  await recordAudit({
    tenantId,
    userId    : updatedBy,
    action    : 'BACKUP_RESTORE_REQUESTED',
    entityType: 'SYSTEM_BACKUP',
    entityId  : null,
    newValues : { requestedAt: new Date().toISOString() },
    req,
  });

  return { accepted: true, message: 'Restore request recorded for operator review' };
}

/**
 * Fetch paginated audit logs for a tenant with optional filters.
 *
 * @param {string|number} tenantId
 * @param {{ userId?, entityType?, action?, from?, to?, page?, limit? }} filters
 */
async function getAuditLogs(tenantId, filters = {}) {
  const {
    userId,
    entityType,
    action,
    from,
    to,
    page  = 1,
    limit = 50,
  } = filters;

  const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const where = {};

  if (tenantId) where.tenant_id = toBigInt(tenantId);
  if (userId)     where.user_id     = toBigInt(userId);
  if (entityType) where.entity_type = entityType;
  if (action)     where.action      = action;

  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(from);
    if (to)   where.created_at.lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    prisma.audit_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take,
      include: { users: { select: { id: true, name: true, email: true } } },
    }),
    prisma.audit_logs.count({ where }),
  ]);

  const data = logs.map((log) => ({
    id        : log.id.toString(),
    tenantId  : log.tenant_id?.toString() ?? null,
    userId    : log.user_id?.toString()   ?? null,
    user      : log.users
      ? {
          id       : log.users.id.toString(),
          name     : log.users.name,
          email    : log.users.email,
        }
      : null,
    action    : log.action,
    entityType: log.entity_type,
    entityId  : log.entity_id ?? null,
    oldValues : log.old_values,
    newValues : log.new_values,
    ipAddress : log.ip_address ?? null,
    userAgent : log.user_agent ?? null,
    createdAt : log.created_at,
  }));

  return {
    data,
    pagination: {
      page : Number(page),
      limit: take,
      total,
      pages: Math.ceil(total / take),
    },
  };
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

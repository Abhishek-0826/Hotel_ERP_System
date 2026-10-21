const prisma = require("../config/db");

const toJsonValue = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));
};

const recordAudit = async ({ tenantId, userId, action, entityType, entityId, oldValues, newValues, req, client = prisma }) => {
  try {
    await client.audit_logs.create({
      data: {
        tenant_id: tenantId ? BigInt(tenantId) : null,
        user_id: userId ? BigInt(userId) : null,
        action,
        entity_type: entityType,
        entity_id: entityId == null ? null : String(entityId),
        old_values: toJsonValue(oldValues),
        new_values: toJsonValue(newValues),
        ip_address: req?.ip || null,
        user_agent: req?.get?.("user-agent") || null,
      },
    });
  } catch (error) {
    console.error("Audit log write failed", error.message);
  }
};

module.exports = { recordAudit };

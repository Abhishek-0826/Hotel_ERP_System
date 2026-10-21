/* ─────────────────────────────────────────────────────────────────────────
   In-app notification inbox (the `notifications` table).
   Separate from notification.service.js, which sends WhatsApp / console messages.
───────────────────────────────────────────────────────────────────────── */
const prisma = require("../../config/db");

const STAFF_ROLES = ["OWNER", "MANAGER", "RECEPTIONIST", "STAFF"];

const format = (row) => ({
  id: row.id.toString(),
  title: row.title,
  body: row.body,
  type: row.type,
  unread: row.unread,
  createdAt: row.created_at,
});

/** Never throws: a failed inbox write must not break the business action that triggered it. */
const notifyUsers = async (userIds, { tenantId, title, body, type }) => {
  try {
    const ids = [...new Set(userIds.filter(Boolean).map(String))];
    if (!ids.length) return;
    await prisma.notifications.createMany({
      data: ids.map((id) => ({ user_id: BigInt(id), tenant_id: tenantId ? BigInt(tenantId) : null, title, body, type })),
    });
  } catch (error) {
    console.error("[INBOX_ERROR]", error.message);
  }
};

/** Notify every active staff member of a hotel. */
const notifyStaff = async (tenantId, payload) => {
  try {
    const staff = await prisma.users.findMany({
      where: { tenant_id: BigInt(tenantId), role: { in: STAFF_ROLES }, status: "ACTIVE" },
      select: { id: true },
    });
    await notifyUsers(staff.map((user) => user.id), { ...payload, tenantId });
  } catch (error) {
    console.error("[INBOX_ERROR]", error.message);
  }
};

const list = async (userId) => {
  const rows = await prisma.notifications.findMany({
    where: { user_id: BigInt(userId) },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  return rows.map(format);
};

const markRead = async (userId, id) => {
  await prisma.notifications.updateMany({ where: { id: BigInt(id), user_id: BigInt(userId) }, data: { unread: false } });
  return { id: String(id), unread: false };
};

const markAllRead = async (userId) => {
  const result = await prisma.notifications.updateMany({ where: { user_id: BigInt(userId), unread: true }, data: { unread: false } });
  return { updated: result.count };
};

module.exports = { notifyUsers, notifyStaff, list, markRead, markAllRead };

const prisma = require("../../config/db");

const tenantWhere = (tenantId) => (
  tenantId === null || tenantId === undefined || tenantId === ""
    ? {}
    : { tenant_id: BigInt(tenantId) }
);

const range = (query) => ({
  ...(query.from ? { gte: new Date(query.from) } : {}),
  ...(query.to ? { lte: new Date(query.to) } : {}),
});

const amount = (value) => Number(value || 0).toFixed(2);

const getDashboard = async (tenantId) => {
  const scope = tenantWhere(tenantId);
  const [properties, owners, beds, occupiedBeds, bookings, pendingBookings, payments, pendingPayments, inHouseGuests, openComplaints, inventory] = await Promise.all([
    prisma.properties.count({ where: scope }),
    prisma.users.count({ where: { ...scope, role: "OWNER", status: "ACTIVE" } }),
    prisma.beds.count({ where: scope }),
    prisma.beds.count({ where: { ...scope, status: "OCCUPIED" } }),
    prisma.bookings.count({ where: scope }),
    prisma.bookings.count({ where: { ...scope, status: "PENDING" } }),
    prisma.payments.aggregate({ where: { ...scope, status: "PAID" }, _sum: { amount: true } }),
    prisma.payments.count({ where: { ...scope, status: { in: ["PENDING", "PARTIAL"] } } }),
    prisma.users.count({ where: { ...scope, role: "GUEST" } }),
    prisma.complaints.count({ where: { ...scope, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.inventory_items.count({ where: { ...scope, current_stock: { lte: prisma.inventory_items.fields.min_stock_level } } }).catch(() => 0),
  ]);

  const availableBeds = beds - occupiedBeds;
  const occupancyPercent = beds ? Number(((occupiedBeds / beds) * 100).toFixed(2)) : 0;
  const revenue = amount(payments._sum.amount);

  return {
    properties,
    owners,
    totalBeds: beds,
    occupiedBeds,
    availableBeds,
    occupancyPercent,
    bookings,
    pendingBookings,
    pendingPayments,
    revenue,
    totalGuests: inHouseGuests.length,
    currentGuests: inHouseGuests.length,
    openComplaints,
    lowStockItems: inventory,
    beds: { total: beds, occupied: occupiedBeds, available: availableBeds, occupancyPercent },
    stats: [
      { label: "Properties", value: properties },
      { label: "Active owners", value: owners },
      { label: "Bookings", value: bookings },
      { label: "Revenue", value: revenue },
    ],
  };
};

const occupancyReport = async (tenantId) => {
  const rows = await prisma.beds.groupBy({ by: ["status"], where: tenantWhere(tenantId), _count: { id: true } });
  return rows.map((row) => ({ status: row.status, count: row._count.id }));
};

const revenueReport = async (tenantId, query) => {
  const rows = await prisma.payments.groupBy({
    by: ["method"],
    where: { ...tenantWhere(tenantId), status: "PAID", ...(query.from || query.to ? { paid_at: range(query) } : {}) },
    _sum: { amount: true },
    _count: { id: true },
  });
  return rows.map((row) => ({ method: row.method, payments: row._count.id, amount: amount(row._sum.amount) }));
};

const guestReport = async (tenantId) => {
  const rows = await prisma.users.findMany({
    where: { ...tenantWhere(tenantId), role: "GUEST" },
    include: { bookings_as_guest: { select: { id: true, status: true } } },
    orderBy: { created_at: "desc" },
  });
  return rows.map((guest) => ({
    id: guest.id.toString(),
    name: guest.name,
    email: guest.email,
    phone: guest.phone,
    status: guest.status,
    bookings: guest.bookings_as_guest.length,
    activeBookings: guest.bookings_as_guest.filter((booking) => booking.status === "CHECKED_IN").length,
  }));
};

const bookingReport = async (tenantId) => {
  const rows = await prisma.bookings.groupBy({ by: ["status"], where: tenantWhere(tenantId), _count: { id: true }, _sum: { total_amount: true } });
  return rows.map((row) => ({ status: row.status, count: row._count.id, value: amount(row._sum.total_amount) }));
};

const paymentReport = async (tenantId) => {
  const rows = await prisma.payments.groupBy({ by: ["status"], where: tenantWhere(tenantId), _count: { id: true }, _sum: { amount: true } });
  return rows.map((row) => ({ status: row.status, count: row._count.id, amount: amount(row._sum.amount) }));
};

const inventoryReport = async (tenantId) => {
  const rows = await prisma.inventory_items.findMany({ where: tenantWhere(tenantId), orderBy: { name: "asc" } });
  return rows.map((item) => ({ id: item.id.toString(), name: item.name, category: item.category, stock: item.current_stock.toString(), minStock: item.min_stock_level.toString(), lowStock: Number(item.current_stock) <= Number(item.min_stock_level) }));
};

const staffPerformance = async (tenantId) => {
  const rows = await prisma.audit_logs.groupBy({ by: ["user_id", "action"], where: { ...tenantWhere(tenantId), user_id: { not: null } }, _count: { id: true } });
  return rows.map((row) => ({ userId: row.user_id.toString(), action: row.action, count: row._count.id }));
};

const complaintReport = async (tenantId) => {
  const rows = await prisma.complaints.groupBy({ by: ["status", "priority"], where: tenantWhere(tenantId), _count: { id: true } });
  return rows.map((row) => ({ status: row.status, priority: row.priority, count: row._count.id }));
};

const feedbackReport = async (tenantId) => {
  const data = await prisma.feedback.aggregate({ where: tenantWhere(tenantId), _count: { id: true }, _avg: { overall_rating: true, service_rating: true, cleanliness_rating: true, value_rating: true } });
  return { total: data._count.id, averageOverall: data._avg.overall_rating || 0, averageService: data._avg.service_rating || 0, averageCleanliness: data._avg.cleanliness_rating || 0, averageValue: data._avg.value_rating || 0 };
};

const bi = async (tenantId, days) => {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const scope = tenantWhere(tenantId);
  const [bookings, payments, feedback] = await Promise.all([
    prisma.bookings.count({ where: { ...scope, created_at: { gte: from } } }),
    prisma.payments.aggregate({ where: { ...scope, status: "PAID", paid_at: { gte: from } }, _sum: { amount: true } }),
    prisma.feedback.aggregate({ where: { ...scope, created_at: { gte: from } }, _avg: { overall_rating: true } }),
  ]);
  return { periodDays: days, bookings, revenue: amount(payments._sum.amount), averageFeedback: feedback._avg.overall_rating || 0 };
};

module.exports = { getDashboard, occupancyReport, revenueReport, guestReport, bookingReport, paymentReport, inventoryReport, staffPerformance, complaintReport, feedbackReport, bi };

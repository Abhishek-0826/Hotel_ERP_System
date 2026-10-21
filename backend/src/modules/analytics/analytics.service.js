/* ─────────────────────────────────────────────────────────────────────────
   src/modules/analytics/analytics.service.js
   Owner dashboard analytics
───────────────────────────────────────────────────────────────────────── */

const prisma = require("../../config/db");

const getOwnerSummary = async (tenantId) => {
  const tenant = BigInt(tenantId);
  const [propertiesCount, roomsCount, bedsCount, activeBookings, totalBookings, occupiedBeds, inHouse] = await Promise.all([
    prisma.properties.count({ where: { tenant_id: tenant } }),
    prisma.rooms.count({ where: { tenant_id: tenant } }),
    prisma.beds.count({ where: { tenant_id: tenant } }),
    prisma.bookings.count({ where: { tenant_id: tenant, status: { in: ["CONFIRMED", "CHECKED_IN"] } } }),
    prisma.bookings.count({ where: { tenant_id: tenant } }),
    prisma.beds.count({ where: { tenant_id: tenant, status: "OCCUPIED" } }),
    prisma.bookings.findMany({ where: { tenant_id: tenant, status: "CHECKED_IN" }, select: { guest_id: true }, distinct: ["guest_id"] }),
  ]);

  const days = Array.from({ length: 7 }, (_, index) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (6 - index));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  });
  const occupiedByDay = await Promise.all(days.map(({ start, end }) => prisma.bookings.count({
    where: {
      tenant_id: tenant,
      status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
      check_in: { lt: end },
      check_out: { gt: start },
    },
  })));
  const occupancy = occupiedByDay.map((count) => bedsCount > 0 ? Math.min(100, Math.round((count / bedsCount) * 100)) : 0);

  return {
    stats: [
      {
        label: "Properties",
        value: propertiesCount,
      },
      {
        label: "Rooms",
        value: roomsCount,
      },
      {
        label: "Beds",
        value: bedsCount,
      },
      {
        label: "Active bookings",
        value: activeBookings,
      },
      {
        label: "Occupied beds",
        value: occupiedBeds,
      },
      {
        label: "Guests in house",
        value: inHouse.length,
      },
    ],

    occupiedBeds,
    availableBeds: Math.max(0, bedsCount - occupiedBeds),
    currentGuests: inHouse.length,

    occupancy,

    occupancyLabels: days.map(({ start }, index) => index === days.length - 1
      ? "Today"
      : start.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })),

    bookings: {
      total: totalBookings,
      active: activeBookings,
    },
  };
};

module.exports = {
  getOwnerSummary,
};

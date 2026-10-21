/* ─────────────────────────────────────────────────────────────────────────
   src/modules/bed/bed.service.js
───────────────────────────────────────────────────────────────────────── */
const prisma = require("../../config/db");

const formatBed = (b) => ({
    id:            b.id.toString(),
    tenantId:      b.tenant_id.toString(),
    roomId:        b.room_id.toString(),
    bedCode:       b.bed_code,
    position:      b.position || null,
    priceOverride: b.price_override === null ? null : Number(b.price_override),
    status:        b.status,
    createdAt:     b.created_at,
    updatedAt:     b.updated_at,
});

const createBed = async ({ tenantId, roomId, bedCode, position, priceOverride, allTenants = false }) => {
    const room = await prisma.rooms.findFirst({
        where: { id: BigInt(roomId), ...(allTenants ? {} : { tenant_id: BigInt(tenantId) }) },
    });
    if (!room) {
        const err = new Error("Room not found or unauthorized"); err.status = 404; err.code = "NOT_FOUND"; throw err;
    }

    const existing = await prisma.beds.findFirst({ where: { room_id: BigInt(roomId), bed_code: bedCode } });
    if (existing) {
        const err = new Error("Bed code already exists in this room"); err.status = 409; err.code = "BED_CODE_EXISTS"; throw err;
    }

    const bed = await prisma.beds.create({
        data: {
            tenant_id:      room.tenant_id,
            room_id:        BigInt(roomId),
            bed_code:       bedCode,
            position:       position || null,
            price_override: priceOverride != null ? priceOverride : null,
            status:         "AVAILABLE",
        },
    });

    return formatBed(bed);
};

const getBedsByRoom = async (roomId, tenantId, { allTenants = false } = {}) => {
    const beds = await prisma.beds.findMany({
        where:   { room_id: BigInt(roomId), ...(allTenants ? {} : { tenant_id: BigInt(tenantId) }) },
        orderBy: { bed_code: "asc" },
    });
    return beds.map(formatBed);
};
const updateBed = async (bedId, tenantId, data, { allTenants = false } = {}) => {
    const existing = await prisma.beds.findFirst({
        where: {
            id: BigInt(bedId),
            ...(allTenants ? {} : { tenant_id: BigInt(tenantId) }),
        },
    });

    if (!existing) {
        const err = new Error("Bed not found or unauthorized");
        err.status = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    const updateData = {};

    if (data.bedCode !== undefined) {
        updateData.bed_code = data.bedCode;
    }

    if (data.position !== undefined) {
        updateData.position = data.position;
    }

    if (data.priceOverride !== undefined) {
        updateData.price_override = data.priceOverride;
    }

    if (data.status !== undefined) {
        updateData.status = data.status;
    }

    updateData.updated_at = new Date();

    const bed = await prisma.beds.update({
        where: {
            id: BigInt(bedId),
        },
        data: updateData,
    });

    return formatBed(bed);
};

module.exports = { createBed, getBedsByRoom, updateBed };

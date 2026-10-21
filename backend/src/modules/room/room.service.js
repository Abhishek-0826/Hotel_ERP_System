/* ─────────────────────────────────────────────────────────────────────────
   src/modules/room/room.service.js
───────────────────────────────────────────────────────────────────────── */
const prisma = require("../../config/db");

const formatRoom = (r) => ({
    id:                  r.id.toString(),
    tenantId:            r.tenant_id.toString(),
    propertyId:          r.property_id.toString(),
    roomNumber:          r.room_number,
    floor:               r.floor,
    genderPolicy:        r.gender_policy,
    hasAc:               r.has_ac,
    hasAttachedBathroom: r.has_attached_bathroom,
    type:                r.has_ac ? "AC" : "Non-AC",
    basePrice:           Number(r.base_price),
    bedsCount:           r.beds_beds_room_idTorooms?.length || 0,
    availableBeds:       (r.beds_beds_room_idTorooms || []).filter((bed) => bed.status === "AVAILABLE").length,
    status:              r.status,
    createdAt:           r.created_at,
    updatedAt:           r.updated_at,
});

const createRoom = async ({ tenantId, propertyId, roomNumber, floor, genderPolicy, hasAc, hasAttachedBathroom, basePrice, allTenants = false }) => {
    // Verify property belongs to tenant
    const property = await prisma.properties.findFirst({
        where: { id: BigInt(propertyId), ...(allTenants ? {} : { tenant_id: BigInt(tenantId) }) },
    });
    if (!property) {
        const err = new Error("Property not found or unauthorized"); err.status = 404; err.code = "NOT_FOUND"; throw err;
    }

    // Duplicate room number check
    const existing = await prisma.rooms.findFirst({
        where: { property_id: BigInt(propertyId), room_number: roomNumber },
    });
    if (existing) {
        const err = new Error("Room number already exists in this property"); err.status = 409; err.code = "ROOM_EXISTS"; throw err;
    }

    const room = await prisma.rooms.create({
        data: {
            tenant_id:            property.tenant_id,
            property_id:          BigInt(propertyId),
            room_number:          roomNumber,
            floor:                floor ?? null,
            gender_policy:        genderPolicy ?? "MIXED",
            has_ac:               hasAc ?? false,
            has_attached_bathroom:hasAttachedBathroom ?? false,
            base_price:           basePrice,
            status:               "ACTIVE",
        },
    });

    return formatRoom(room);
};

const getRoomsByProperty = async (propertyId, tenantId, { allTenants = false } = {}) => {
    const rooms = await prisma.rooms.findMany({
        where:   { property_id: BigInt(propertyId), ...(allTenants ? {} : { tenant_id: BigInt(tenantId) }) },
        orderBy: { room_number: "asc" },
        include: { beds_beds_room_idTorooms: { orderBy: { bed_code: "asc" } } },
    });

    return rooms.map((r) => ({
        ...formatRoom(r),
        beds: r.beds_beds_room_idTorooms.map((b) => ({
            id:            b.id.toString(),
            bedCode:       b.bed_code,
            position:      b.position,
            priceOverride: b.price_override === null ? null : Number(b.price_override),
            status:        b.status,
        })),
    }));
};

const updateRoom = async (roomId, tenantId, data, { allTenants = false } = {}) => {
    const existing = await prisma.rooms.findFirst({ where: { id: BigInt(roomId), ...(allTenants ? {} : { tenant_id: BigInt(tenantId) }) } });
    if (!existing) {
        const err = new Error("Room not found or unauthorized"); err.status = 404; err.code = "NOT_FOUND"; throw err;
    }

    // If changing room number, check for duplicates
    if (data.roomNumber && data.roomNumber !== existing.room_number) {
        const dup = await prisma.rooms.findFirst({
            where: { property_id: existing.property_id, room_number: data.roomNumber },
        });
        if (dup) {
            const err = new Error("Room number already exists"); err.status = 409; err.code = "ROOM_EXISTS"; throw err;
        }
    }

    const room = await prisma.rooms.update({
        where: { id: BigInt(roomId) },
        data: {
            room_number:          data.roomNumber,
            floor:                data.floor,
            gender_policy:        data.genderPolicy,
            has_ac:               data.hasAc,
            has_attached_bathroom:data.hasAttachedBathroom,
            base_price:           data.basePrice,
            status:               data.status,
            updated_at:           new Date(),
        },
    });

    return formatRoom(room);
};

module.exports = { createRoom, getRoomsByProperty, updateRoom };

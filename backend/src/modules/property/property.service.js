/* ─────────────────────────────────────────────────────────────────────────
   src/modules/property/property.service.js
   Full property service: search, detail, create, update, publish, availability
───────────────────────────────────────────────────────────────────────── */
const prisma = require("../../config/db");

/* ── DTO mapper ── */
const propertyRooms = (p) => p.rooms_rooms_property_idToproperties || [];
const roomBeds = (room) => room.beds_beds_room_idTorooms || [];

// The database owns the source facts. Counts and starting prices are derived
// here so public and owner views cannot drift from the rooms/beds inventory.
const formatProperty = (p) => {
    const rooms = propertyRooms(p);
    const beds = rooms.flatMap(roomBeds);
    const roomPrices = rooms.map((room) => Number(room.base_price));
    const derivedStartingPrice = roomPrices.length ? Math.min(...roomPrices) : 0;

    return {
        id:             p.id.toString(),
        tenantId:       p.tenant_id.toString(),
        slug:           p.slug,
        name:           p.name,
        city:           p.city || null,
        area:           p.area || null,
        address:        p.address || null,
        state:          p.state || null,
        description:    p.description || null,
        type:           p.property_type,
        genderPolicy:   p.gender_policy,
        amenities:      (p.property_amenities || []).map((pa) => pa.amenities?.name || pa.amenity_name).filter(Boolean),
        price:          Number(p.price ?? derivedStartingPrice),
        startingPrice:  Number(p.starting_price ?? derivedStartingPrice),
        rating:         Number(p.rating),
        reviews:        p.reviews,
        roomsCount:     rooms.length,
        bedsCount:      beds.length,
        availableBeds:  beds.filter((bed) => bed.status === "AVAILABLE").length,
        featured:       p.featured,
        status:         p.status,
        postalCode:     p.postal_code || null,
        latitude:       p.latitude === null ? null : Number(p.latitude),
        longitude:      p.longitude === null ? null : Number(p.longitude),
        createdAt:      p.created_at,
        updatedAt:      p.updated_at,
    };
};

/* ── GET /properties ── */
const searchProperties = async ({ city, state, search, page = 1, pageSize, limit = 20 }, tenantId) => {
    const where = { status: "PUBLISHED", tenant_id: BigInt(tenantId) };

    if (city)   where.city  = { contains: city,   mode: "insensitive" };
    if (state)  where.state = { contains: state,  mode: "insensitive" };
    if (search) {
        where.OR = [
            { name:    { contains: search, mode: "insensitive" } },
            { city:    { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
        ];
    }

    const pageNum  = Math.max(1, parseInt(page));
    const resolvedPageSize = Math.min(50, Math.max(1, parseInt(pageSize || limit)));
    const skip     = (pageNum - 1) * resolvedPageSize;

    const [properties, total] = await Promise.all([
        prisma.properties.findMany({
            where, skip, take: resolvedPageSize, orderBy: { created_at: "desc" },
            include: {
                property_amenities: { include: { amenities: true } },
                rooms_rooms_property_idToproperties: { include: { beds_beds_room_idTorooms: true } },
            },
        }),
        prisma.properties.count({ where }),
    ]);

    return {
        items:      properties.map(formatProperty),
        page:       pageNum,
        pageSize:   resolvedPageSize,
        totalItems: total,
        totalPages: Math.ceil(total / resolvedPageSize),
    };
};
const getMyProperties = async (tenantId, { allTenants = false } = {}) => {
    const properties = await prisma.properties.findMany({
        where: allTenants ? {} : { tenant_id: BigInt(tenantId) },
        orderBy: { created_at: "desc" },
        include: {
            property_amenities: { include: { amenities: true } },
            rooms_rooms_property_idToproperties: { include: { beds_beds_room_idTorooms: true } },
        },
    });

    return properties.map(formatProperty);
};
/* ── GET /properties/:slug ── */
const getPropertyBySlug = async (slug, tenantId) => {
    const property = await prisma.properties.findFirst({
        where: { slug, status: "PUBLISHED", ...(tenantId ? { tenant_id: BigInt(tenantId) } : {}) },
        include: {
            property_amenities: { include: { amenities: true } },
            rooms_rooms_property_idToproperties: {
                where: { status: "ACTIVE" },
                include: { beds_beds_room_idTorooms: true, room_amenities: { include: { amenities: true } } },
                orderBy: { room_number: "asc" },
            },
        },
    });

    if (!property) {
        const err = new Error("Property not found"); err.status = 404; err.code = "NOT_FOUND"; throw err;
    }

    return {
        ...formatProperty(property),
        amenities: property.property_amenities.map((pa) => pa.amenities.name),
        rooms: property.rooms_rooms_property_idToproperties.map((r) => ({
            id:                 r.id.toString(),
            roomNumber:         r.room_number,
            floor:              r.floor,
            genderPolicy:       r.gender_policy,
            hasAc:              r.has_ac,
            hasAttachedBathroom:r.has_attached_bathroom,
            type:               r.has_ac ? "AC" : "Non-AC",
            basePrice:          Number(r.base_price),
            bedsCount:          r.beds_beds_room_idTorooms.length,
            availableBeds:      r.beds_beds_room_idTorooms.filter((bed) => bed.status === "AVAILABLE").length,
            status:             r.status,
            amenities:          r.room_amenities.map((ra) => ({ id: ra.amenities.id.toString(), name: ra.amenities.name })),
            beds: r.beds_beds_room_idTorooms.map((b) => ({
                id:            b.id.toString(),
                bedCode:       b.bed_code,
                position:      b.position,
                priceOverride: b.price_override === null ? null : Number(b.price_override),
                effectivePrice:Number(b.price_override ?? r.base_price),
                status:        b.status,
            })),
        })),
    };
};

/* ── GET /properties/:slug/availability ── */
const getPropertyAvailability = async (slug, checkIn, checkOut, tenantId) => {
    if (!checkIn || !checkOut) {
        const err = new Error("checkIn and checkOut are required"); err.status = 400; err.code = "VALIDATION_ERROR"; throw err;
    }

    const checkInDate  = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate) || isNaN(checkOutDate)) {
        const err = new Error("Invalid date format"); err.status = 400; err.code = "INVALID_DATE"; throw err;
    }
    if (checkInDate >= checkOutDate) {
        const err = new Error("checkOut must be after checkIn"); err.status = 400; err.code = "INVALID_DATE_RANGE"; throw err;
    }

    const property = await prisma.properties.findFirst({
        where: { slug, status: "PUBLISHED", ...(tenantId ? { tenant_id: BigInt(tenantId) } : {}) },
    });
    if (!property) {
        const err = new Error("Property not found"); err.status = 404; err.code = "NOT_FOUND"; throw err;
    }

    const rooms = await prisma.rooms.findMany({
        where:   { property_id: property.id, tenant_id: property.tenant_id, status: "ACTIVE" },
        orderBy: { room_number: "asc" },
        include: { beds_beds_room_idTorooms: { orderBy: { bed_code: "asc" } } },
    });

    // Fetch all overlapping bookings for this property in ONE query (no N+1)
    const allBedIds = rooms.flatMap((r) => r.beds_beds_room_idTorooms.map((b) => b.id));

    const bookedBedIds = new Set();
    if (allBedIds.length > 0) {
        const overlapping = await prisma.bookings.findMany({
            where: {
                bed_id:   { in: allBedIds },
                status:   { in: ["PENDING", "CONFIRMED"] },
                check_in: { lt: checkOutDate },
                check_out:{ gt: checkInDate },
            },
            select: { bed_id: true },
        });
        overlapping.forEach((b) => bookedBedIds.add(b.bed_id.toString()));
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / 86400000);

    return {
        propertyId:   property.id.toString(),
        propertyName: property.name,
        checkIn,
        checkOut,
        nights,
        rooms: rooms.map((r) => ({
            id:                  r.id.toString(),
            roomNumber:          r.room_number,
            genderPolicy:        r.gender_policy,
            hasAc:               r.has_ac,
            hasAttachedBathroom: r.has_attached_bathroom,
            type:                r.has_ac ? "AC" : "Non-AC",
            basePrice:           Number(r.base_price),
            bedsCount:           r.beds_beds_room_idTorooms.length,
            availableBeds:       r.beds_beds_room_idTorooms.filter((bed) => bed.status === "AVAILABLE").length,
            beds: r.beds_beds_room_idTorooms.map((b) => {
                const effectivePrice = b.price_override ?? r.base_price;
                const isBooked       = bookedBedIds.has(b.id.toString());
                const displayStatus  = isBooked ? "BOOKED"
                    : b.status !== "AVAILABLE" ? b.status
                    : "AVAILABLE";
                return {
                    id:            b.id.toString(),
                    bedCode:       b.bed_code,
                    position:      b.position,
                    effectivePrice:Number(effectivePrice),
                    totalForStay:  Number(effectivePrice) * nights,
                    status:        displayStatus,
                    isBookable:    displayStatus === "AVAILABLE",
                };
            }),
        })),
    };
};

/* ── POST /properties ── */
const createProperty = async ({ tenantId, name, slug, description, address, city, area, state, postalCode, latitude, longitude, type, genderPolicy, price, startingPrice, rating, reviews, featured }) => {
    const existing = await prisma.properties.findFirst({ where: { tenant_id: BigInt(tenantId), slug } });
    if (existing) {
        const err = new Error("Property slug already exists for this tenant"); err.status = 409; err.code = "SLUG_EXISTS"; throw err;
    }

    const property = await prisma.properties.create({
        data: {
            tenant_id:   BigInt(tenantId),
            name, slug, description,
            address, city, area: area || null, state,
            postal_code: postalCode || null,
            latitude:    latitude  || null,
            longitude:   longitude || null,
            property_type: type || "PG",
            gender_policy: genderPolicy || "MIXED",
            price: price ?? null,
            starting_price: startingPrice ?? price ?? null,
            rating: rating ?? 0,
            reviews: reviews ?? 0,
            featured: featured ?? false,
            status: "DRAFT",
        },
    });

    return formatProperty(property);
};

/* ── PATCH /properties/:propertyId ── */
const updateProperty = async (propertyId, tenantId, data, { allTenants = false } = {}) => {
    const existing = await prisma.properties.findFirst({ where: { id: BigInt(propertyId), ...(allTenants ? {} : { tenant_id: BigInt(tenantId) }) } });
    if (!existing) { const err = new Error("Property not found"); err.status = 404; err.code = "NOT_FOUND"; throw err; }

    const updateData = { updated_at: new Date() };
    const fields = {
        name: data.name, description: data.description, address: data.address,
        city: data.city, area: data.area, state: data.state, postal_code: data.postalCode,
        latitude: data.latitude, longitude: data.longitude, property_type: data.type,
        gender_policy: data.genderPolicy, price: data.price, starting_price: data.startingPrice,
        rating: data.rating, reviews: data.reviews, featured: data.featured,
    };
    for (const [field, value] of Object.entries(fields)) {
        if (value !== undefined) updateData[field] = value;
    }

    const property = await prisma.properties.update({
        where: { id: BigInt(propertyId) },
        data: updateData,
    });
    return formatProperty(property);
};

/* ── PATCH /properties/:propertyId/status ── */
const updatePropertyStatus = async (propertyId, tenantId, status, { allTenants = false } = {}) => {
    const existing = await prisma.properties.findFirst({
        where: {
            id: BigInt(propertyId),
            ...(allTenants ? {} : { tenant_id: BigInt(tenantId) }),
        },
    });

    if (!existing) {
        const err = new Error("Property not found");
        err.status = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    const updated = await prisma.properties.update({
        where: {
            id: BigInt(propertyId),
        },
        data: {
            status,
        },
    });

    return formatProperty(updated);
};
/* ── DELETE /properties/:propertyId ── */
const deleteProperty = async (propertyId, tenantId, { allTenants = false } = {}) => {
    const existing = await prisma.properties.findFirst({
        where: {
            id: BigInt(propertyId),
            ...(allTenants ? {} : { tenant_id: BigInt(tenantId) }),
        },
    });

    if (!existing) {
        const err = new Error("Property not found");
        err.status = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    await prisma.properties.delete({
        where: {
            id: BigInt(propertyId),
        },
    });

    return {
        id: existing.id.toString(),
        tenantId: existing.tenant_id.toString(),
    };
};


module.exports = {
    searchProperties,
    getMyProperties,
    getPropertyBySlug,
    getPropertyAvailability,
    createProperty,
    updateProperty,
    updatePropertyStatus,
    deleteProperty,
};

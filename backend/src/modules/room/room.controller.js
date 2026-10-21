/* ─────────────────────────────────────────────────────────────────────────
   src/modules/room/room.controller.js
───────────────────────────────────────────────────────────────────────── */
const svc = require("./room.service");
const allTenants = (req) => ["PLATFORM_ADMIN", "ADMIN"].includes(req.user?.role);

const createRoom = async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const room = await svc.createRoom({ propertyId, ...req.body, tenantId: req.user.tenantId, allTenants: allTenants(req) });
        res.status(201).json({ success: true, message: "Room created", data: room });
    } catch (err) { next(err); }
};

const getRoomsByProperty = async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const tenantId = req.user.tenantId;
        if (!tenantId && !allTenants(req)) {
            return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "tenantId is required" });
        }
        const rooms = await svc.getRoomsByProperty(propertyId, tenantId, { allTenants: allTenants(req) });
        res.status(200).json({ success: true, data: rooms });
    } catch (err) { next(err); }
};

const updateRoom = async (req, res, next) => {
    try {
        const { roomId }     = req.params;
        const { tenantId: _ignoredTenantId, ...rest } = req.body;
        const room = await svc.updateRoom(roomId, req.user.tenantId, rest, { allTenants: allTenants(req) });
        res.status(200).json({ success: true, message: "Room updated", data: room });
    } catch (err) { next(err); }
};

module.exports = { createRoom, getRoomsByProperty, updateRoom };

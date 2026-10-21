const prisma = require("../../config/db");
const { recordAudit } = require("../../common/audit.service");

const fail = (message, status, code) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
};

const id = (value) => {
  if (!/^\d+$/.test(String(value))) fail("Camera id must be a positive integer", 400, "VALIDATION_ERROR");
  return BigInt(value);
};

const formatCamera = (camera) => ({
  id: camera.id.toString(),
  name: camera.name,
  location: camera.location,
  status: camera.status,
  streamUrl: camera.stream_url,
  createdAt: camera.created_at,
  lastUpdated: camera.updated_at,
});

const listCameras = async (status) => {
  const cameras = await prisma.cameras.findMany({
    where: status ? { status } : undefined,
    orderBy: { name: "asc" },
  });
  return cameras.map(formatCamera);
};

const createCamera = async (data, actor, req) => {
  const camera = await prisma.cameras.create({
    data: {
      name: data.name,
      location: data.location,
      status: data.status,
      stream_url: data.streamUrl || null,
    },
  });
  await recordAudit({
    userId: actor.userId,
    action: "CAMERA_CREATED",
    entityType: "CAMERA",
    entityId: camera.id,
    newValues: { name: camera.name, location: camera.location, status: camera.status },
    req,
  });
  return formatCamera(camera);
};

const updateCamera = async (cameraId, data, actor, req) => {
  const existing = await prisma.cameras.findUnique({ where: { id: id(cameraId) } });
  if (!existing) fail("Camera not found", 404, "NOT_FOUND");

  const camera = await prisma.cameras.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.streamUrl !== undefined ? { stream_url: data.streamUrl } : {}),
      updated_at: new Date(),
    },
  });
  await recordAudit({
    userId: actor.userId,
    action: "CAMERA_UPDATED",
    entityType: "CAMERA",
    entityId: camera.id,
    oldValues: { name: existing.name, location: existing.location, status: existing.status },
    newValues: { name: camera.name, location: camera.location, status: camera.status },
    req,
  });
  return formatCamera(camera);
};

const deleteCamera = async (cameraId, actor, req) => {
  const existing = await prisma.cameras.findUnique({ where: { id: id(cameraId) } });
  if (!existing) fail("Camera not found", 404, "NOT_FOUND");
  await prisma.cameras.delete({ where: { id: existing.id } });
  await recordAudit({
    userId: actor.userId,
    action: "CAMERA_DELETED",
    entityType: "CAMERA",
    entityId: existing.id,
    oldValues: { name: existing.name, location: existing.location, status: existing.status },
    req,
  });
  return { id: existing.id.toString(), deleted: true };
};

module.exports = { listCameras, createCamera, updateCamera, deleteCamera };

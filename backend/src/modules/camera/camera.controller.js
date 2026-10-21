const service = require("./camera.service");

const list = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await service.listCameras(req.query.status) }); }
  catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await service.createCamera(req.body, req.user, req) }); }
  catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await service.updateCamera(req.params.cameraId, req.body, req.user, req) }); }
  catch (error) { next(error); }
};

const remove = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await service.deleteCamera(req.params.cameraId, req.user, req) }); }
  catch (error) { next(error); }
};

module.exports = { list, create, update, remove };

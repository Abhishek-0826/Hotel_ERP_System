const express = require("express");
const inbox = require("./inbox.service");
const { authenticate } = require("../../middleware/auth");

const router = express.Router();
router.use(authenticate);

const handle = (fn) => async (req, res, next) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (error) {
    next(error);
  }
};

router.get("/", handle((req) => inbox.list(req.user.userId)));
router.patch("/read-all", handle((req) => inbox.markAllRead(req.user.userId)));
router.patch("/:id/read", handle((req) => {
  if (!/^\d+$/.test(req.params.id)) {
    const error = new Error("Invalid notification id");
    error.status = 400;
    error.code = "INVALID_ID";
    throw error;
  }
  return inbox.markRead(req.user.userId, req.params.id);
}));

module.exports = router;

const express = require("express"); const controller = require("./management.controller"); const validate = require("../../middleware/validate"); const { authenticate } = require("../../middleware/auth"); const { requirePermission } = require("../../common/rbac"); const { createUserSchema, userStatusSchema, passwordResetSchema, itemSchema, stockSchema } = require("./management.validation");
const router = express.Router();

router.use(authenticate);
router.post("/users", requirePermission("users:manage"), validate(createUserSchema), controller.createUser);
router.get("/users", requirePermission("users:read"), controller.listUsers);
router.patch("/users/:userId/status", requirePermission("users:manage"), validate(userStatusSchema), controller.updateUserStatus);
router.post("/users/:userId/reset-password", requirePermission("users:manage"), validate(passwordResetSchema), controller.resetUserPassword);
router.delete("/users/:userId", requirePermission("users:manage"), controller.deleteUser);
router.post("/inventory/items", requirePermission("inventory:manage"), validate(itemSchema), controller.createItem);
router.get("/inventory/items", requirePermission("inventory:read"), controller.listItems);
router.post("/inventory/items/:itemId/check", requirePermission("inventory:manage"), validate(stockSchema), controller.adjustStock);
router.get("/inventory/items/:itemId/history", requirePermission("inventory:read"), controller.stockHistory);
module.exports = router;

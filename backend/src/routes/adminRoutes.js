const express = require("express");

const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/sales", adminController.getAdminSalesOverview);
router.get("/users", adminController.getAdminUsersOverview);
router.post("/users", authMiddleware, adminController.createAdminUser);

module.exports = router;

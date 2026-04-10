const express = require("express");

const salesController = require("../controllers/salesController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, salesController.createSale);

module.exports = router;

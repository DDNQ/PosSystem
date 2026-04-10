const express = require("express");

const cashierController = require("../controllers/cashierController");

const router = express.Router();

router.get("/performance", cashierController.getCashierPerformance);

module.exports = router;

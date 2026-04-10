const express = require("express");

const reportController = require("../controllers/reportController");

const router = express.Router();

router.get("/daily-sales", reportController.getDailySalesReport);
router.get("/product-performance", reportController.getProductPerformanceReport);
router.get("/payment-summary", reportController.getPaymentSummaryReport);

module.exports = router;

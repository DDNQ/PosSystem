const express = require("express");

const paymentController = require("../controllers/paymentController");

const router = express.Router();

router.post("/", paymentController.createPayment);
router.post("/paystack/initialize", paymentController.initializePaystackPayment);
router.get("/paystack/verify/:reference", paymentController.verifyPaystackPayment);
router.post("/paystack/webhook", paymentController.handlePaystackWebhook);

module.exports = router;

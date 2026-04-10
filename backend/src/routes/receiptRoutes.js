const express = require("express");

const receiptController = require("../controllers/receiptController");

const router = express.Router();

router.get("/:saleId", receiptController.getReceipt);

module.exports = router;

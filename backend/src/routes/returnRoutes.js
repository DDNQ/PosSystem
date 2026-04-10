const express = require("express");

const returnController = require("../controllers/returnController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/receipt/:receiptNumber", returnController.getReturnableSaleByReceiptNumber);
router.post("/", authMiddleware, returnController.createReturn);

module.exports = router;

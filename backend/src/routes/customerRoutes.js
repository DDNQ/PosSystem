const express = require("express");

const customerController = require("../controllers/customerController");

const router = express.Router();

router.post("/", customerController.createCustomer);
router.get("/", customerController.getCustomers);
router.get("/history", customerController.getCustomerHistory);
router.get("/:id", customerController.getCustomerById);
router.put("/:id", customerController.updateCustomer);

module.exports = router;

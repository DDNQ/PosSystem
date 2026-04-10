const express = require("express");

const inventoryController = require("../controllers/inventoryController");

const router = express.Router();

router.get("/low-stock", inventoryController.getLowStockProducts);
router.get("/", inventoryController.getInventory);
router.patch("/:productId/adjust", inventoryController.adjustInventory);

module.exports = router;

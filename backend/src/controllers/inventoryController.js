const inventoryService = require("../services/inventoryService");

const getInventory = async (_req, res, next) => {
  try {
    const products = await inventoryService.getInventory();

    res.status(200).json({
      products,
    });
  } catch (error) {
    next(error);
  }
};

const adjustInventory = async (req, res, next) => {
  try {
    const result = await inventoryService.adjustInventory(req.params.productId, req.body);

    res.status(200).json({
      message: "Inventory updated successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getLowStockProducts = async (_req, res, next) => {
  try {
    const products = await inventoryService.getLowStockProducts();

    res.status(200).json({
      products,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  adjustInventory,
  getLowStockProducts,
};

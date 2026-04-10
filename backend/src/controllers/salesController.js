const salesService = require("../services/salesService");

const createSale = async (req, res, next) => {
  try {
    const sale = await salesService.createSale({
      cashierId: req.user?.id,
      customerId: req.body?.customerId,
      items: req.body?.items,
      terminalName: req.body?.terminalName ?? req.headers["x-terminal-name"],
    });

    res.status(201).json({
      message: "Sale created successfully",
      sale,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
};

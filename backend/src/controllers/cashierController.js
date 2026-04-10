const cashierService = require("../services/cashierService");

const getCashierPerformance = async (_req, res, next) => {
  try {
    const performance = await cashierService.getCashierPerformance();

    res.status(200).json(performance);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCashierPerformance,
};

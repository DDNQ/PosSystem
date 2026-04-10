const dashboardService = require("../services/dashboardService");

const getDashboardSummary = async (_req, res, next) => {
  try {
    const summary = await dashboardService.getDashboardSummary();

    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
};

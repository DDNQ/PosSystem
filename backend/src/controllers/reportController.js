const reportService = require("../services/reportService");

const getDailySalesReport = async (req, res, next) => {
  try {
    const report = await reportService.getDailySalesReport(req.query);

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

const getProductPerformanceReport = async (req, res, next) => {
  try {
    const report = await reportService.getProductPerformanceReport(req.query);

    res.status(200).json({
      products: report,
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentSummaryReport = async (req, res, next) => {
  try {
    const report = await reportService.getPaymentSummaryReport(req.query);

    res.status(200).json({
      payments: report,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailySalesReport,
  getProductPerformanceReport,
  getPaymentSummaryReport,
};

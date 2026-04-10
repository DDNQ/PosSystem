const customerService = require("../services/customerService");

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);

    res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    next(error);
  }
};

const getCustomers = async (_req, res, next) => {
  try {
    const customers = await customerService.getCustomers();

    res.status(200).json({
      customers,
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerHistory = async (_req, res, next) => {
  try {
    const customerHistory = await customerService.getCustomerHistoryAnalytics();

    res.status(200).json(customerHistory);
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);

    res.status(200).json({
      customer,
    });
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);

    res.status(200).json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerHistory,
  getCustomerById,
  updateCustomer,
};

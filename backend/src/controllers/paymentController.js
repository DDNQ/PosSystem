const paymentService = require("../services/paymentService");

const createPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment(req.body);

    res.status(201).json({
      message: "Payment created successfully",
      payment,
    });
  } catch (error) {
    next(error);
  }
};

const initializePaystackPayment = async (req, res, next) => {
  try {
    const paymentInitialization = await paymentService.initializePaystackPayment(req.body);

    res.status(200).json({
      message: "Paystack payment initialized successfully",
      ...paymentInitialization,
    });
  } catch (error) {
    next(error);
  }
};

const verifyPaystackPayment = async (req, res, next) => {
  try {
    const verification = await paymentService.verifyPaystackPayment(req.params.reference);

    res.status(200).json(verification);
  } catch (error) {
    next(error);
  }
};

const handlePaystackWebhook = async (req, res, next) => {
  try {
    const result = await paymentService.handlePaystackWebhook({
      rawBody: req.rawBody,
      signature: req.get("x-paystack-signature"),
      event: req.body,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  handlePaystackWebhook,
  initializePaystackPayment,
  verifyPaystackPayment,
};

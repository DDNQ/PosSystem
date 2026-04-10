const receiptService = require("../services/receiptService");

const getReceipt = async (req, res, next) => {
  try {
    const receipt = await receiptService.getReceiptBySaleId(req.params.saleId);

    res.status(200).json(receipt);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReceipt,
};

const returnService = require("../services/returnService");

const getReturnableSaleByReceiptNumber = async (req, res, next) => {
  try {
    const sale = await returnService.getReturnableSaleByReceiptNumber(req.params.receiptNumber);

    res.status(200).json(sale);
  } catch (error) {
    next(error);
  }
};

const createReturn = async (req, res, next) => {
  try {
    const refund = await returnService.createReturn({
      cashierId: req.user?.id,
      saleId: req.body?.saleId,
      items: req.body?.items,
      refundMethod: req.body?.refundMethod,
    });

    res.status(201).json({
      message: "Return processed successfully",
      refund,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReturnableSaleByReceiptNumber,
  createReturn,
};

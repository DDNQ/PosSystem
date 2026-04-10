const prisma = require("../config/prisma");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    throw createError(`${fieldName} must be a valid positive integer`, 400);
  }

  return parsedValue;
};

const toCurrencyNumber = (value) => Number(value);

const formatReceiptNumber = (saleId) => `RCPT-${String(saleId).padStart(4, "0")}`;

const getReceiptBySaleId = async (saleId) => {
  const parsedSaleId = parsePositiveInteger(saleId, "Sale ID");

  const sale = await prisma.sale.findUnique({
    where: { id: parsedSaleId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          loyaltyPoints: true,
        },
      },
      cashier: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              imageUrl: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      },
      payments: {
        where: {
          status: "SUCCESS",
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!sale) {
    throw createError("Sale not found", 404);
  }

  const payments = sale.payments.map((payment) => ({
    id: payment.id,
    status: payment.status,
    method: payment.method,
    amountPaid: toCurrencyNumber(payment.amountPaid),
    changeGiven: toCurrencyNumber(payment.changeGiven),
    reference: payment.reference,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  }));

  const amountPaid = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
  const changeGiven = payments.reduce((sum, payment) => sum + payment.changeGiven, 0);

  return {
    receiptNumber: formatReceiptNumber(sale.id),
    saleId: sale.id,
    date: sale.createdAt,
    cashier: sale.cashier
      ? {
          id: sale.cashier.id,
          name: `${sale.cashier.firstName} ${sale.cashier.lastName}`.trim(),
          email: sale.cashier.email,
          role: sale.cashier.role,
        }
      : null,
    customer: sale.customer
      ? {
          id: sale.customer.id,
          name: sale.customer.name,
          email: sale.customer.email,
          phone: sale.customer.phone,
          loyaltyPoints: sale.customer.loyaltyPoints,
        }
      : null,
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product ? item.product.name : null,
      sku: item.product ? item.product.sku : null,
      barcode: item.product ? item.product.barcode : null,
      imageUrl: item.product ? item.product.imageUrl : null,
      quantity: item.quantity,
      unitPrice: toCurrencyNumber(item.unitPrice),
      total: toCurrencyNumber(item.total),
    })),
    subtotal: toCurrencyNumber(sale.subtotal),
    tax: toCurrencyNumber(sale.tax),
    discount: toCurrencyNumber(sale.discount),
    total: toCurrencyNumber(sale.total),
    payments,
    amountPaid,
    changeGiven,
  };
};

module.exports = {
  getReceiptBySaleId,
};

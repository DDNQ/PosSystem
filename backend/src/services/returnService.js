const prisma = require("../config/prisma");

const RETURN_WINDOW_DAYS = 30;

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toCurrencyNumber = (value) => Number(value || 0);

const roundToTwoDecimals = (value) => Number(toCurrencyNumber(value).toFixed(2));

const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    throw createError(`${fieldName} must be a valid positive integer`, 400);
  }

  return parsedValue;
};

const normalizeReceiptNumber = (receiptNumber) => String(receiptNumber ?? "").trim().toUpperCase();

const formatReceiptNumber = (saleId) => `RCPT-${String(saleId).padStart(4, "0")}`;

const parseReceiptNumber = (receiptNumber) => {
  const normalizedReceiptNumber = normalizeReceiptNumber(receiptNumber);
  const receiptMatch = /^RCPT-(\d+)$/.exec(normalizedReceiptNumber);

  if (!receiptMatch) {
    throw createError("Receipt number is invalid", 400);
  }

  return parsePositiveInteger(receiptMatch[1], "Receipt number");
};

const ensureReturnWindow = (saleDate) => {
  const saleTimestamp = new Date(saleDate).getTime();
  const ageInDays = (Date.now() - saleTimestamp) / (1000 * 60 * 60 * 24);

  if (ageInDays > RETURN_WINDOW_DAYS) {
    throw createError(`Only sales from the last ${RETURN_WINDOW_DAYS} days are eligible for return`, 400);
  }
};

const buildReturnedQuantityMap = (refunds) => {
  const returnedQuantityBySaleItemId = new Map();

  refunds.forEach((refund) => {
    refund.items.forEach((refundItem) => {
      returnedQuantityBySaleItemId.set(
        refundItem.saleItemId,
        (returnedQuantityBySaleItemId.get(refundItem.saleItemId) || 0) + refundItem.quantity
      );
    });
  });

  return returnedQuantityBySaleItemId;
};

const buildReturnReceiptResponse = (sale) => {
  ensureReturnWindow(sale.createdAt);

  const returnedQuantityBySaleItemId = buildReturnedQuantityMap(sale.refunds);
  const firstSuccessfulPayment = sale.payments[0] || null;

  return {
    saleId: sale.id,
    receiptNumber: formatReceiptNumber(sale.id),
    date: sale.createdAt,
    customer: sale.customer
      ? {
          id: sale.customer.id,
          name: sale.customer.name,
          email: sale.customer.email,
          phone: sale.customer.phone,
          loyaltyPoints: sale.customer.loyaltyPoints,
        }
      : null,
    originalTotal: toCurrencyNumber(sale.total),
    paymentMethod: firstSuccessfulPayment ? firstSuccessfulPayment.method : null,
    itemsCount: sale.items.length,
    items: sale.items.map((item) => {
      const quantityAlreadyReturned = returnedQuantityBySaleItemId.get(item.id) || 0;
      const quantityEligible = Math.max(item.quantity - quantityAlreadyReturned, 0);

      return {
        productId: item.productId,
        name: item.product?.name ?? null,
        sku: item.product?.sku ?? null,
        unitPrice: toCurrencyNumber(item.unitPrice),
        quantityPurchased: item.quantity,
        quantityAlreadyReturned,
        quantityEligible,
      };
    }),
  };
};

const getSaleForReturnById = async (saleId) => {
  const parsedSaleId = parsePositiveInteger(saleId, "Sale ID");

  const sale = await prisma.sale.findUnique({
    where: {
      id: parsedSaleId,
    },
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
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
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
      refunds: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!sale) {
    throw createError("Sale not found", 404);
  }

  return sale;
};

const getReturnableSaleByReceiptNumber = async (receiptNumber) => {
  const saleId = parseReceiptNumber(receiptNumber);
  const sale = await getSaleForReturnById(saleId);

  return buildReturnReceiptResponse(sale);
};

const validateReturnItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createError("Items to return are required", 400);
  }

  const aggregatedItems = new Map();

  items.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      throw createError(`Return item at index ${index} is invalid`, 400);
    }

    const productId = parsePositiveInteger(item.productId, `Return item ${index + 1} productId`);
    const quantity = parsePositiveInteger(item.quantity, `Return item ${index + 1} quantity`);

    aggregatedItems.set(productId, (aggregatedItems.get(productId) || 0) + quantity);
  });

  return aggregatedItems;
};

const buildEligibleReturnAllocations = (saleItems, refunds) => {
  const returnedQuantityBySaleItemId = buildReturnedQuantityMap(refunds);

  return saleItems.map((saleItem) => {
    const quantityAlreadyReturned = returnedQuantityBySaleItemId.get(saleItem.id) || 0;
    const quantityEligible = Math.max(saleItem.quantity - quantityAlreadyReturned, 0);

    return {
      saleItemId: saleItem.id,
      productId: saleItem.productId,
      productName: saleItem.product?.name ?? "Product",
      quantityEligible,
      unitPrice: toCurrencyNumber(saleItem.unitPrice),
    };
  });
};

const createReturn = async ({ cashierId, saleId, items, refundMethod }) => {
  if (!cashierId || !String(cashierId).trim()) {
    throw createError("Authenticated cashier is required", 401);
  }

  const normalizedRefundMethod = String(refundMethod ?? "").trim();

  if (!normalizedRefundMethod) {
    throw createError("Refund method is required", 400);
  }

  const aggregatedReturnItems = validateReturnItems(items);
  const sale = await getSaleForReturnById(saleId);

  ensureReturnWindow(sale.createdAt);

  const eligibleAllocations = buildEligibleReturnAllocations(sale.items, sale.refunds);
  const eligibleByProductId = eligibleAllocations.reduce((productMap, allocation) => {
    productMap.set(
      allocation.productId,
      (productMap.get(allocation.productId) || 0) + allocation.quantityEligible
    );
    return productMap;
  }, new Map());

  aggregatedReturnItems.forEach((quantityToReturn, productId) => {
    const quantityEligible = eligibleByProductId.get(productId) || 0;

    if (quantityEligible <= 0) {
      throw createError(`Product ID ${productId} is not eligible for return on this sale`, 400);
    }

    if (quantityToReturn > quantityEligible) {
      throw createError(
        `Return quantity for product ID ${productId} exceeds the eligible quantity`,
        400
      );
    }
  });

  const refundItemsToCreate = [];

  aggregatedReturnItems.forEach((quantityToReturn, productId) => {
    let remainingQuantity = quantityToReturn;

    eligibleAllocations
      .filter((allocation) => allocation.productId === productId && allocation.quantityEligible > 0)
      .forEach((allocation) => {
        if (remainingQuantity <= 0) {
          return;
        }

        const allocatedQuantity = Math.min(remainingQuantity, allocation.quantityEligible);

        if (allocatedQuantity > 0) {
          refundItemsToCreate.push({
            saleItemId: allocation.saleItemId,
            productId: allocation.productId,
            quantity: allocatedQuantity,
            unitPrice: allocation.unitPrice,
            subtotal: roundToTwoDecimals(allocation.unitPrice * allocatedQuantity),
          });
          remainingQuantity -= allocatedQuantity;
        }
      });

    if (remainingQuantity > 0) {
      throw createError(`Unable to fully allocate return quantity for product ID ${productId}`, 400);
    }
  });

  const refundSubtotal = roundToTwoDecimals(
    refundItemsToCreate.reduce((sum, item) => sum + item.subtotal, 0)
  );
  const effectiveTaxRate =
    toCurrencyNumber(sale.subtotal) > 0 ? toCurrencyNumber(sale.tax) / toCurrencyNumber(sale.subtotal) : 0;
  const taxAdjustment = roundToTwoDecimals(refundSubtotal * effectiveTaxRate);
  const refundTotal = roundToTwoDecimals(refundSubtotal + taxAdjustment);

  const refund = await prisma.$transaction(async (tx) => {
    const createdRefund = await tx.refund.create({
      data: {
        saleId: sale.id,
        cashierId: String(cashierId).trim(),
        refundMethod: normalizedRefundMethod,
        subtotal: refundSubtotal,
        taxAdjustment,
        total: refundTotal,
      },
    });

    for (const refundItem of refundItemsToCreate) {
      await tx.refundItem.create({
        data: {
          refundId: createdRefund.id,
          saleItemId: refundItem.saleItemId,
          productId: refundItem.productId,
          quantity: refundItem.quantity,
          unitPrice: refundItem.unitPrice,
          subtotal: refundItem.subtotal,
        },
      });

      await tx.product.update({
        where: {
          id: refundItem.productId,
        },
        data: {
          stock: {
            increment: refundItem.quantity,
          },
        },
      });
    }

    return tx.refund.findUnique({
      where: {
        id: createdRefund.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });
  });

  return {
    id: refund.id,
    saleId: refund.saleId,
    refundMethod: refund.refundMethod,
    subtotal: toCurrencyNumber(refund.subtotal),
    taxAdjustment: toCurrencyNumber(refund.taxAdjustment),
    total: toCurrencyNumber(refund.total),
    items: refund.items.map((item) => ({
      id: item.id,
      saleItemId: item.saleItemId,
      productId: item.productId,
      name: item.product?.name ?? null,
      sku: item.product?.sku ?? null,
      quantity: item.quantity,
      unitPrice: toCurrencyNumber(item.unitPrice),
      subtotal: toCurrencyNumber(item.subtotal),
    })),
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt,
  };
};

module.exports = {
  getReturnableSaleByReceiptNumber,
  createReturn,
};

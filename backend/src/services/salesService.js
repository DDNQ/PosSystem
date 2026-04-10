const prisma = require("../config/prisma");

const TAX_RATE = 0.1;

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

const normalizeTerminalName = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(0, 100);
};

const formatSale = (sale) => ({
  id: sale.id,
  subtotal: toCurrencyNumber(sale.subtotal),
  tax: toCurrencyNumber(sale.tax),
  discount: toCurrencyNumber(sale.discount),
  total: toCurrencyNumber(sale.total),
  terminalName: sale.terminalName ?? null,
  customerId: sale.customerId,
  customer: sale.customer
    ? {
        id: sale.customer.id,
        name: sale.customer.name,
        email: sale.customer.email,
        phone: sale.customer.phone,
        loyaltyPoints: sale.customer.loyaltyPoints,
      }
    : null,
  cashierId: sale.cashierId,
  cashier: sale.cashier
    ? {
        id: sale.cashier.id,
        email: sale.cashier.email,
        firstName: sale.cashier.firstName,
        lastName: sale.cashier.lastName,
        role: sale.cashier.role,
      }
    : null,
  items: sale.items.map((item) => ({
    id: item.id,
    saleId: item.saleId,
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: toCurrencyNumber(item.unitPrice),
    total: toCurrencyNumber(item.total),
    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          price: toCurrencyNumber(item.product.price),
          stock: item.product.stock,
        }
      : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  })),
  createdAt: sale.createdAt,
  updatedAt: sale.updatedAt,
});

const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createError("Items array is required and cannot be empty", 400);
  }

  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw createError(`Item at index ${index} is invalid`, 400);
    }

    return {
      productId: parsePositiveInteger(item.productId, `Item ${index + 1} productId`),
      quantity: parsePositiveInteger(item.quantity, `Item ${index + 1} quantity`),
    };
  });
};

const createSale = async ({ cashierId, customerId, items, terminalName }) => {
  if (!cashierId || !String(cashierId).trim()) {
    throw createError("Authenticated cashier is required", 401);
  }

  const normalizedCashierId = String(cashierId).trim();
  const normalizedTerminalName = normalizeTerminalName(terminalName);
  const normalizedCustomerId =
    customerId === undefined || customerId === null
      ? null
      : parsePositiveInteger(customerId, "Customer ID");
  const normalizedItems = validateItems(items);

  const [cashier, customer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: normalizedCashierId },
    }),
    normalizedCustomerId === null
      ? Promise.resolve(null)
      : prisma.customer.findUnique({
          where: { id: normalizedCustomerId },
        }),
  ]);

  if (!cashier) {
    throw createError("Cashier not found", 404);
  }

  if (normalizedCustomerId !== null && !customer) {
    throw createError("Customer not found", 404);
  }

  const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of normalizedItems) {
    const product = productMap.get(item.productId);

    if (!product) {
      throw createError(`Product with ID ${item.productId} not found`, 404);
    }

    if (product.stock < item.quantity) {
      throw createError(`Insufficient stock for product ${product.name}`, 400);
    }
  }

  const saleItemsData = normalizedItems.map((item) => {
    const product = productMap.get(item.productId);
    const unitPrice = toCurrencyNumber(product.price);
    const total = unitPrice * item.quantity;

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      total,
    };
  });

  const subtotal = saleItemsData.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * TAX_RATE;
  const discount = 0;
  const total = subtotal + tax - discount;

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        cashierId: normalizedCashierId,
        customerId: normalizedCustomerId,
        terminalName: normalizedTerminalName,
        subtotal,
        tax,
        discount,
        total,
      },
    });

    await tx.saleItem.createMany({
      data: saleItemsData.map((item) => ({
        saleId: createdSale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });

    for (const item of saleItemsData) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    return tx.sale.findUnique({
      where: { id: createdSale.id },
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
                price: true,
                stock: true,
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

  return formatSale(sale);
};

module.exports = {
  createSale,
};

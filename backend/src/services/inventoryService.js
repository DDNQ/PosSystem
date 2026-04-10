const prisma = require("../config/prisma");

const LOW_STOCK_THRESHOLD = 5;
const INVENTORY_TYPES = {
  IN: "IN",
  OUT: "OUT",
  ADJUSTMENT: "ADJUSTMENT",
};

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

const parseInteger = (value, fieldName) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue)) {
    throw createError(`${fieldName} must be a valid integer`, 400);
  }

  return parsedValue;
};

const validateMovementType = (type) => {
  if (!type || !INVENTORY_TYPES[type]) {
    throw createError("Type must be one of IN, OUT, or ADJUSTMENT", 400);
  }

  return type;
};

const formatProduct = (product) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  sku: product.sku,
  barcode: product.barcode,
  imageUrl: product.imageUrl,
  stock: product.stock,
  isActive: product.isActive,
  categoryId: product.categoryId,
  category: product.category
    ? {
        id: product.category.id,
        name: product.category.name,
        description: product.category.description,
        isActive: product.category.isActive,
      }
    : null,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const formatInventoryLog = (log) => ({
  id: log.id,
  productId: log.productId,
  quantityChanged: log.quantityChanged,
  type: log.type,
  reason: log.reason,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt,
});

const getProductWithCategoryOrThrow = async (tx, productId) => {
  const product = await tx.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
    },
  });

  if (!product) {
    throw createError("Product not found", 404);
  }

  return product;
};

const getInventory = async () => {
  const products = await prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return products.map(formatProduct);
};

const adjustInventory = async (productId, { quantityChanged, type, reason }) => {
  const parsedProductId = parsePositiveInteger(productId, "Product ID");
  const parsedQuantityChanged = parseInteger(quantityChanged, "Quantity changed");
  const validatedType = validateMovementType(type);

  if (parsedQuantityChanged === 0) {
    throw createError("Quantity changed cannot be zero", 400);
  }

  if (reason !== undefined && reason !== null && !String(reason).trim()) {
    throw createError("Reason cannot be empty", 400);
  }

  if (validatedType === INVENTORY_TYPES.IN && parsedQuantityChanged < 0) {
    throw createError("Quantity changed must be positive for IN movements", 400);
  }

  if (validatedType === INVENTORY_TYPES.OUT && parsedQuantityChanged > 0) {
    throw createError("Quantity changed must be negative for OUT movements", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await getProductWithCategoryOrThrow(tx, parsedProductId);
    const updatedStock = product.stock + parsedQuantityChanged;

    if (updatedStock < 0) {
      throw createError("Insufficient stock for this adjustment", 400);
    }

    const updatedProduct = await tx.product.update({
      where: { id: parsedProductId },
      data: {
        stock: updatedStock,
      },
      include: {
        category: true,
      },
    });

    const inventoryLog = await tx.inventoryLog.create({
      data: {
        productId: parsedProductId,
        quantityChanged: parsedQuantityChanged,
        type: validatedType,
        reason: reason ? String(reason).trim() : null,
      },
    });

    return {
      product: updatedProduct,
      inventoryLog,
    };
  });

  return {
    product: formatProduct(result.product),
    inventoryLog: formatInventoryLog(result.inventoryLog),
  };
};

const getLowStockProducts = async () => {
  const products = await prisma.product.findMany({
    where: {
      stock: {
        lte: LOW_STOCK_THRESHOLD,
      },
    },
    include: {
      category: true,
    },
    orderBy: [
      {
        stock: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  return products.map(formatProduct);
};

module.exports = {
  getInventory,
  adjustInventory,
  getLowStockProducts,
};

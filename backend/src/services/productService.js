const prisma = require("../config/prisma");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const productInclude = {
  category: true,
};

const parseInteger = (value, fieldName) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    throw createError(`${fieldName} must be a valid positive integer`, 400);
  }

  return parsedValue;
};

const formatProduct = (product) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  sku: product.sku,
  price: Number(product.price),
  stock: product.stock,
  barcode: product.barcode,
  imageUrl: product.imageUrl,
  isActive: product.isActive,
  categoryId: product.categoryId,
  category: product.category
    ? {
        id: product.category.id,
        name: product.category.name,
        description: product.category.description,
        isActive: product.category.isActive,
        createdAt: product.category.createdAt,
        updatedAt: product.category.updatedAt,
      }
    : null,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const ensureCategoryExists = async (categoryId) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw createError("Category not found", 404);
  }
};

const validateProductPayload = (
  { name, sku, price, stock, barcode, imageUrl, categoryId },
  isUpdate = false
) => {
  if (!isUpdate) {
    if (!name || !sku || price === undefined || stock === undefined || categoryId === undefined) {
      throw createError("Name, sku, price, stock, and categoryId are required", 400);
    }
  }

  if (name !== undefined && !String(name).trim()) {
    throw createError("Product name cannot be empty", 400);
  }

  if (sku !== undefined && !String(sku).trim()) {
    throw createError("SKU cannot be empty", 400);
  }

  if (price !== undefined) {
    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      throw createError("Price must be a valid non-negative number", 400);
    }
  }

  if (stock !== undefined) {
    const numericStock = Number(stock);

    if (!Number.isInteger(numericStock) || numericStock < 0) {
      throw createError("Stock must be a valid non-negative integer", 400);
    }
  }

  if (barcode !== undefined && barcode !== null && !String(barcode).trim()) {
    throw createError("Barcode cannot be empty", 400);
  }

  if (imageUrl !== undefined && imageUrl !== null && !String(imageUrl).trim()) {
    throw createError("Image URL cannot be empty", 400);
  }

  if (categoryId !== undefined) {
    parseInteger(categoryId, "Category ID");
  }
};

const getProductOrThrow = async (id) => {
  const productId = parseInteger(id, "Product ID");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });

  if (!product) {
    throw createError("Product not found", 404);
  }

  return product;
};

const createProduct = async ({
  name,
  description,
  sku,
  price,
  stock,
  barcode,
  imageUrl,
  categoryId,
  isActive,
}) => {
  validateProductPayload({ name, sku, price, stock, barcode, imageUrl, categoryId });
  const parsedCategoryId = parseInteger(categoryId, "Category ID");
  await ensureCategoryExists(parsedCategoryId);

  try {
    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        sku: String(sku).trim(),
        price,
        stock: Number.parseInt(stock, 10),
        barcode: barcode ? String(barcode).trim() : null,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        categoryId: parsedCategoryId,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
      include: productInclude,
    });

    return formatProduct(product);
  } catch (error) {
    if (error.code === "P2002") {
      throw createError("A product with this SKU already exists", 409);
    }

    throw error;
  }
};

const getProducts = async () => {
  const products = await prisma.product.findMany({
    include: productInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return products.map(formatProduct);
};

const searchProducts = async (query) => {
  if (!query || !String(query).trim()) {
    throw createError("Search query is required", 400);
  }

  const products = await prisma.product.findMany({
    where: {
      name: {
        contains: String(query).trim(),
        mode: "insensitive",
      },
    },
    include: productInclude,
    orderBy: {
      name: "asc",
    },
  });

  return products.map(formatProduct);
};

const getProductByBarcode = async (barcode) => {
  const normalizedBarcode = String(barcode ?? "").trim();

  if (!normalizedBarcode) {
    throw createError("Barcode is required", 400);
  }

  const product = await prisma.product.findUnique({
    where: {
      barcode: normalizedBarcode,
    },
    include: productInclude,
  });

  if (!product) {
    throw createError("Product not found", 404);
  }

  return formatProduct(product);
};

const getProductById = async (id) => {
  const product = await getProductOrThrow(id);
  return formatProduct(product);
};

const updateProduct = async (
  id,
  { name, description, sku, price, stock, barcode, imageUrl, categoryId, isActive }
) => {
  validateProductPayload({ name, sku, price, stock, barcode, imageUrl, categoryId }, true);
  const productId = parseInteger(id, "Product ID");
  await getProductOrThrow(productId);
  const parsedCategoryId = categoryId !== undefined ? parseInteger(categoryId, "Category ID") : undefined;

  if (parsedCategoryId !== undefined) {
    await ensureCategoryExists(parsedCategoryId);
  }

  const data = {};

  if (name !== undefined) {
    data.name = String(name).trim();
  }

  if (description !== undefined) {
    data.description = description ? String(description).trim() : null;
  }

  if (sku !== undefined) {
    data.sku = String(sku).trim();
  }

  if (price !== undefined) {
    data.price = price;
  }

  if (stock !== undefined) {
    data.stock = Number.parseInt(stock, 10);
  }

  if (barcode !== undefined) {
    data.barcode = barcode ? String(barcode).trim() : null;
  }

  if (imageUrl !== undefined) {
    data.imageUrl = imageUrl ? String(imageUrl).trim() : null;
  }

  if (parsedCategoryId !== undefined) {
    data.categoryId = parsedCategoryId;
  }

  if (typeof isActive === "boolean") {
    data.isActive = isActive;
  }

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data,
      include: productInclude,
    });

    return formatProduct(product);
  } catch (error) {
    if (error.code === "P2002") {
      throw createError("A product with this SKU already exists", 409);
    }

    throw error;
  }
};

const deleteProduct = async (id) => {
  const productId = parseInteger(id, "Product ID");
  await getProductOrThrow(productId);

  await prisma.product.delete({
    where: { id: productId },
  });
};

module.exports = {
  createProduct,
  getProducts,
  searchProducts,
  getProductByBarcode,
  getProductById,
  updateProduct,
  deleteProduct,
};

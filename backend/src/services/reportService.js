const prisma = require("../config/prisma");

const toCurrencyNumber = (value) => Number(value || 0);

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseOptionalDate = (value, fieldName, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const normalizedValue = String(value).trim();
  const parsedDate = new Date(
    endOfDay ? `${normalizedValue}T23:59:59.999Z` : `${normalizedValue}T00:00:00.000Z`
  );

  if (Number.isNaN(parsedDate.getTime())) {
    throw createError(`${fieldName} must be a valid date`, 400);
  }

  return parsedDate;
};

const buildSaleFilters = ({ startDate, endDate, search, section }) => {
  const parsedStartDate = parseOptionalDate(startDate, "Start date");
  const parsedEndDate = parseOptionalDate(endDate, "End date", true);

  if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
    throw createError("Start date cannot be after end date", 400);
  }

  const normalizedSearch = String(search ?? "").trim();
  const normalizedSection = String(section ?? "").trim();
  const saleWhere = {};
  const saleItemWhere = {};
  const paymentSaleWhere = {};

  if (parsedStartDate || parsedEndDate) {
    const createdAt = {};

    if (parsedStartDate) {
      createdAt.gte = parsedStartDate;
    }

    if (parsedEndDate) {
      createdAt.lte = parsedEndDate;
    }

    saleWhere.createdAt = createdAt;
    paymentSaleWhere.createdAt = createdAt;
    saleItemWhere.sale = {
      createdAt,
    };
  }

  const searchFilters = [];

  if (normalizedSearch) {
    searchFilters.push(
      {
        cashier: {
          OR: [
            {
              firstName: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
            {
              lastName: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
          ],
        },
      },
      {
        customer: {
          OR: [
            {
              name: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
            {
              phone: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
          ],
        },
      },
      {
        items: {
          some: {
            product: {
              OR: [
                {
                  name: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
                {
                  sku: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
                {
                  category: {
                    name: {
                      contains: normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            },
          },
        },
      }
    );
  }

  if (normalizedSection) {
    const sectionFilter = {
      items: {
        some: {
          product: {
            category: {
              name: {
                contains: normalizedSection,
                mode: "insensitive",
              },
            },
          },
        },
      },
    };

    searchFilters.push(sectionFilter);
  }

  if (searchFilters.length) {
    saleWhere.AND = [...(saleWhere.AND ?? []), ...searchFilters];
    paymentSaleWhere.AND = [...(paymentSaleWhere.AND ?? []), ...searchFilters];
  }

  const productFilters = [];

  if (normalizedSearch) {
    productFilters.push({
      OR: [
        {
          product: {
            name: {
              contains: normalizedSearch,
              mode: "insensitive",
            },
          },
        },
        {
          product: {
            sku: {
              contains: normalizedSearch,
              mode: "insensitive",
            },
          },
        },
        {
          product: {
            category: {
              name: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  }

  if (normalizedSection) {
    productFilters.push({
      product: {
        category: {
          name: {
            contains: normalizedSection,
            mode: "insensitive",
          },
        },
      },
    });
  }

  if (productFilters.length) {
    saleItemWhere.AND = [...(saleItemWhere.AND ?? []), ...productFilters];
  }

  return {
    saleWhere,
    saleItemWhere,
    paymentWhere: {
      status: "SUCCESS",
      sale: paymentSaleWhere,
    },
  };
};

const getDailySalesReport = async (filters = {}) => {
  const { saleWhere } = buildSaleFilters(filters);

  const [transactionCount, salesAggregate] = await Promise.all([
    prisma.sale.count({
      where: saleWhere,
    }),
    prisma.sale.aggregate({
      where: saleWhere,
      _sum: {
        total: true,
      },
      _avg: {
        total: true,
      },
    }),
  ]);

  return {
    totalSales: toCurrencyNumber(salesAggregate._sum.total),
    transactions: transactionCount,
    averageSale: toCurrencyNumber(salesAggregate._avg.total),
  };
};

const getProductPerformanceReport = async (filters = {}) => {
  const { saleItemWhere } = buildSaleFilters(filters);

  const groupedItems = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: saleItemWhere,
    _sum: {
      quantity: true,
      total: true,
    },
    orderBy: {
      _sum: {
        total: "desc",
      },
    },
  });

  const productIds = groupedItems.map((item) => item.productId);

  if (productIds.length === 0) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  return groupedItems.map((item) => {
    const product = productMap.get(item.productId);

    return {
      productId: item.productId,
      name: product ? product.name : null,
      sku: product ? product.sku : null,
      currentPrice: product ? toCurrencyNumber(product.price) : 0,
      quantitySold: item._sum.quantity || 0,
      revenue: toCurrencyNumber(item._sum.total),
    };
  });
};

const getPaymentSummaryReport = async (filters = {}) => {
  const { paymentWhere } = buildSaleFilters(filters);

  const groupedPayments = await prisma.payment.groupBy({
    by: ["method"],
    where: paymentWhere,
    _sum: {
      amountPaid: true,
      changeGiven: true,
    },
    _count: {
      _all: true,
    },
    orderBy: {
      method: "asc",
    },
  });

  return groupedPayments.map((payment) => ({
    method: payment.method,
    transactions: payment._count._all,
    totalAmountPaid: toCurrencyNumber(payment._sum.amountPaid),
    totalChangeGiven: toCurrencyNumber(payment._sum.changeGiven),
  }));
};

module.exports = {
  getDailySalesReport,
  getProductPerformanceReport,
  getPaymentSummaryReport,
};

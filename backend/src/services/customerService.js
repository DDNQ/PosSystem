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

const formatCustomer = (customer) => ({
  id: customer.id,
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  address: customer.address,
  loyaltyPoints: customer.loyaltyPoints,
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

const normalizeOptionalString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmedValue = String(value).trim();
  return trimmedValue ? trimmedValue : null;
};

const toCurrencyNumber = (value) => Number(value || 0);

const roundToTwo = (value) => Number(value.toFixed(2));

const validateCustomerPayload = (payload, isUpdate = false) => {
  const { name, loyaltyPoints } = payload;

  if (!isUpdate && (!name || !String(name).trim())) {
    throw createError("Customer name is required", 400);
  }

  if (name !== undefined && !String(name).trim()) {
    throw createError("Customer name cannot be empty", 400);
  }

  if (loyaltyPoints !== undefined) {
    const parsedLoyaltyPoints = Number(loyaltyPoints);

    if (!Number.isInteger(parsedLoyaltyPoints) || parsedLoyaltyPoints < 0) {
      throw createError("Loyalty points must be a valid non-negative integer", 400);
    }
  }
};

const handlePrismaError = (error) => {
  if (error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "field";
    throw createError(`A customer with this ${target} already exists`, 409);
  }

  throw error;
};

const getCustomerOrThrow = async (id) => {
  const customerId = parsePositiveInteger(id, "Customer ID");

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw createError("Customer not found", 404);
  }

  return customer;
};

const createCustomer = async ({ name, email, phone, address, loyaltyPoints }) => {
  validateCustomerPayload({ name, loyaltyPoints });

  try {
    const customer = await prisma.customer.create({
      data: {
        name: String(name).trim(),
        email: normalizeOptionalString(email),
        phone: normalizeOptionalString(phone),
        address: normalizeOptionalString(address),
        loyaltyPoints: loyaltyPoints !== undefined ? Number(loyaltyPoints) : 0,
      },
    });

    return formatCustomer(customer);
  } catch (error) {
    handlePrismaError(error);
  }
};

const getCustomers = async () => {
  const customers = await prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return customers.map(formatCustomer);
};

const getCustomerById = async (id) => {
  const customer = await getCustomerOrThrow(id);
  return formatCustomer(customer);
};

const getCustomerSegment = ({ totalSpend, visits }) => {
  if (totalSpend >= 1000) {
    return "VIP";
  }

  if (visits >= 10) {
    return "Loyal";
  }

  if (visits >= 2) {
    return "Returning";
  }

  return "New";
};

const formatCustomerHistoryItem = (customer) => {
  const visits = customer.sales.length;
  const totalSpend = customer.sales.reduce((sum, sale) => sum + toCurrencyNumber(sale.total), 0);
  const lastPurchase = customer.sales.reduce((latest, sale) => {
    if (!latest || sale.createdAt > latest) {
      return sale.createdAt;
    }

    return latest;
  }, null);

  return {
    id: customer.id,
    name: customer.name,
    visits,
    lastPurchase,
    totalSpend: roundToTwo(totalSpend),
    segment: getCustomerSegment({
      totalSpend,
      visits,
    }),
  };
};

const getCustomerHistoryAnalytics = async () => {
  const customers = await prisma.customer.findMany({
    include: {
      sales: {
        select: {
          total: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const history = customers
    .filter((customer) => customer.sales.length > 0)
    .map(formatCustomerHistoryItem)
    .sort((left, right) => {
      const leftTime = left.lastPurchase ? new Date(left.lastPurchase).getTime() : 0;
      const rightTime = right.lastPurchase ? new Date(right.lastPurchase).getTime() : 0;

      return rightTime - leftTime;
    });

  const returningCustomers = history.filter((customer) => customer.visits >= 2);
  const repeatSpendTotal = returningCustomers.reduce((sum, customer) => sum + customer.totalSpend, 0);

  return {
    summary: {
      returningCustomers: returningCustomers.length,
      returningCustomersPercent:
        history.length > 0 ? roundToTwo((returningCustomers.length / history.length) * 100) : 0,
      loyaltySignups: customers.filter((customer) => customer.loyaltyPoints > 0).length,
      averageRepeatSpend:
        returningCustomers.length > 0
          ? roundToTwo(repeatSpendTotal / returningCustomers.length)
          : 0,
    },
    history,
  };
};

const updateCustomer = async (id, { name, email, phone, address, loyaltyPoints }) => {
  const customerId = parsePositiveInteger(id, "Customer ID");
  validateCustomerPayload({ name, loyaltyPoints }, true);
  await getCustomerOrThrow(customerId);

  const data = {};

  if (name !== undefined) {
    data.name = String(name).trim();
  }

  if (email !== undefined) {
    data.email = normalizeOptionalString(email);
  }

  if (phone !== undefined) {
    data.phone = normalizeOptionalString(phone);
  }

  if (address !== undefined) {
    data.address = normalizeOptionalString(address);
  }

  if (loyaltyPoints !== undefined) {
    data.loyaltyPoints = Number(loyaltyPoints);
  }

  try {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data,
    });

    return formatCustomer(customer);
  } catch (error) {
    handlePrismaError(error);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  getCustomerHistoryAnalytics,
  updateCustomer,
};

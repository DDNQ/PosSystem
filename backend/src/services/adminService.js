const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const {
  ALLOWED_ROLES,
  ALLOWED_STATUSES,
  SALT_ROUNDS,
  createError,
  normalizeRole,
  normalizeStatus,
} = require("./authService");
const { splitName, sanitizeUser } = require("../utils/user");

const toCurrencyNumber = (value) => Number(value || 0);

const roundToTwoDecimals = (value) => Number(toCurrencyNumber(value).toFixed(2));

const formatReceiptNumber = (saleId) => `RCPT-${String(saleId).padStart(4, "0")}`;

const buildCashierName = (cashier) =>
  [cashier?.firstName, cashier?.lastName].filter(Boolean).join(" ").trim() || "Unknown Cashier";

const buildUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "Unknown User";

const getUserBranchValue = () => "Not assigned";

const mapAdminUser = (user) => ({
  id: user.id,
  name: buildUserName(user),
  email: user.email,
  role: user.role,
  branch: user.branch || getUserBranchValue(user),
  status: user.status,
});

const resolveFallbackTerminalName = (sale) => {
  if (sale.cashier?.role === "ADMIN" || sale.cashier?.role === "MANAGER") {
    return "MAIN-OFFICE-01";
  }

  return "POS-04";
};

const getTerminalValue = (sale) => {
  const storedTerminalName = String(sale.terminalName ?? "").trim();

  if (storedTerminalName) {
    return storedTerminalName;
  }

  return resolveFallbackTerminalName(sale);
};

const getSaleStatus = (refundCount) => (refundCount > 0 ? "Refunded" : "Completed");

const getTodayRange = () => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  return {
    startOfToday,
    startOfTomorrow,
  };
};

const getAdminSalesOverview = async () => {
  const { startOfToday, startOfTomorrow } = getTodayRange();

  const [sales, todaysCompletedSalesTotal, totalSalesCount, refundedSalesCount] = await Promise.all([
    prisma.sale.findMany({
      include: {
        cashier: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        items: {
          select: {
            quantity: true,
          },
        },
        refunds: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.sale.aggregate({
      _sum: {
        total: true,
      },
      where: {
        createdAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
        refunds: {
          none: {},
        },
      },
    }),
    prisma.sale.count(),
    prisma.sale.count({
      where: {
        refunds: {
          some: {},
        },
      },
    }),
  ]);

  const salesList = sales.map((sale) => ({
    id: sale.id,
    receiptNumber: formatReceiptNumber(sale.id),
    date: sale.createdAt,
    cashier: buildCashierName(sale.cashier),
    terminal: getTerminalValue(sale),
    itemsCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
    total: toCurrencyNumber(sale.total),
    status: getSaleStatus(sale.refunds.length),
  }));

  const refundRate =
    totalSalesCount > 0 ? roundToTwoDecimals((refundedSalesCount / totalSalesCount) * 100) : 0;

  return {
    summary: {
      totalSalesToday: roundToTwoDecimals(todaysCompletedSalesTotal._sum.total),
      totalTransactions: totalSalesCount,
      refundRate,
    },
    sales: salesList,
  };
};

const getAdminUsersOverview = async () => {
  const [users, totalUsers, managers, cashiers] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        branch: true,
        status: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        role: "MANAGER",
      },
    }),
    prisma.user.count({
      where: {
        role: "CASHIER",
      },
    }),
  ]);

  return {
    summary: {
      totalUsers,
      managers,
      cashiers,
    },
    users: users.map(mapAdminUser),
  };
};

const createAdminUser = async (authenticatedUser, payload) => {
  if (!authenticatedUser?.id) {
    throw createError("Authentication is required", 401);
  }

  if (String(authenticatedUser.role ?? "").trim().toUpperCase() !== "ADMIN") {
    throw createError("Only admins can create users", 403);
  }

  const fullName = String(payload?.fullName ?? "").trim();
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const branch = String(payload?.branch ?? "").trim();
  const temporaryPassword = String(payload?.temporaryPassword ?? "").trim();
  const normalizedRole = normalizeRole(payload?.role);
  const normalizedStatus = normalizeStatus(payload?.status);

  if (!fullName || !email || !temporaryPassword || !normalizedRole || !normalizedStatus) {
    throw createError(
      "Full name, email, role, status, and temporary password are required",
      400
    );
  }

  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    throw createError("Invalid role provided", 400);
  }

  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    throw createError("Invalid status provided", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw createError("User with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
  const { firstName, lastName } = splitName(fullName);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: normalizedRole,
      branch: branch || null,
      status: normalizedStatus,
      isActive: normalizedStatus !== "DISABLED",
    },
  });

  return sanitizeUser(user);
};

module.exports = {
  getAdminSalesOverview,
  getAdminUsersOverview,
  createAdminUser,
};

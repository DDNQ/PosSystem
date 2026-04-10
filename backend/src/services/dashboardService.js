const prisma = require("../config/prisma");

const LOW_STOCK_THRESHOLD = 5;

const getDashboardSummary = async () => {
  const [lowStock, activeCashiers] = await Promise.all([
    prisma.product.count({
      where: {
        stock: {
          lte: LOW_STOCK_THRESHOLD,
        },
      },
    }),
    prisma.user.count({
      where: {
        role: "CASHIER",
      },
    }),
  ]);

  return {
    todaySales: 0,
    transactions: 0,
    lowStock,
    activeCashiers,
  };
};

module.exports = {
  getDashboardSummary,
};

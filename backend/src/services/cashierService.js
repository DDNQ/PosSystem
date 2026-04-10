const prisma = require("../config/prisma");

const toNumber = (value) => Number(value || 0);

const roundToTwoDecimals = (value) => Number(toNumber(value).toFixed(2));

const buildCashierName = (cashier) => `${cashier.firstName} ${cashier.lastName}`.trim();

const getCashierPerformance = async () => {
  const [cashiers, salesByCashier, refundsByCashier] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "CASHIER",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],
    }),
    prisma.sale.groupBy({
      by: ["cashierId"],
      _count: {
        _all: true,
      },
      _avg: {
        total: true,
      },
    }),
    prisma.refund.groupBy({
      by: ["cashierId"],
      _count: {
        saleId: true,
      },
    }),
  ]);

  const salesMap = new Map(
    salesByCashier.map((saleGroup) => [
      saleGroup.cashierId,
      {
        transactions: saleGroup._count._all || 0,
        avgBasket: roundToTwoDecimals(saleGroup._avg.total),
      },
    ])
  );

  const refundsMap = new Map(
    refundsByCashier.map((refundGroup) => [refundGroup.cashierId, refundGroup._count.saleId || 0])
  );

  const cashiersWithMetrics = cashiers.map((cashier) => {
    const saleMetrics = salesMap.get(cashier.id) || {
      transactions: 0,
      avgBasket: 0,
    };

    const refundedTransactions = refundsMap.get(cashier.id) || 0;
    const refundRate =
      saleMetrics.transactions > 0
        ? roundToTwoDecimals((refundedTransactions / saleMetrics.transactions) * 100)
        : 0;
    const accuracy = roundToTwoDecimals(100 - refundRate);

    return {
      id: cashier.id,
      name: buildCashierName(cashier),
      transactions: saleMetrics.transactions,
      avgBasket: saleMetrics.avgBasket,
      refundRate,
      accuracy,
    };
  });

  const shiftThroughput = cashiersWithMetrics.reduce(
    (sum, cashier) => sum + cashier.transactions,
    0
  );

  const averageRefundRate =
    cashiersWithMetrics.length > 0
      ? roundToTwoDecimals(
          cashiersWithMetrics.reduce((sum, cashier) => sum + cashier.refundRate, 0) /
            cashiersWithMetrics.length
        )
      : 0;

  const topAccuracy =
    cashiersWithMetrics.length > 0
      ? roundToTwoDecimals(
          cashiersWithMetrics.reduce(
            (highestAccuracy, cashier) => Math.max(highestAccuracy, cashier.accuracy),
            0
          )
        )
      : 0;

  return {
    summary: {
      topAccuracy,
      shiftThroughput,
      averageRefundRate,
    },
    cashiers: cashiersWithMetrics,
  };
};

module.exports = {
  getCashierPerformance,
};

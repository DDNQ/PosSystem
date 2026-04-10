import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Box,
  ClipboardList,
  DollarSign,
  Download,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import "../styles/dashboard.css";
import { ROLES } from "../utils/auth";
import { formatCurrency } from "../utils/currency";
import {
  getDailySalesReport,
  getDashboardSummary,
  getLowStockProducts,
} from "../services/api";

const DASHBOARD_CONFIG = {
  [ROLES.ADMIN]: {
    title: "Admin Dashboard",
    description:
      "Control users, product catalog, inventory, and sales visibility from one workspace.",
    actions: [
      { label: "Manage Users", icon: UserCog, tone: "secondary", path: "/user-management" },
      { label: "Open Reports", icon: Download, tone: "ghost", path: "/reports" },
      { label: "View All Sales", icon: ClipboardList, tone: "primary", path: "/all-sales" },
    ],
    chartTitle: "Sales History Trend",
    chartDescription:
      "Hourly revenue history appears here when the backend provides trend snapshots.",
    chartBadge: "Awaiting History Feed",
    alertsTitle: "Inventory Alerts",
    alertsDescription: "Backend-driven low-stock products that need administrative visibility.",
    reviewTitle: "Administration Review",
    reviewDescription: "Core system checkpoints for the current business day.",
    secondaryActions: [
      { label: "Manage Catalog", icon: Box, path: "/inventory" },
      { label: "Open User Management", icon: Users, path: "/user-management" },
    ],
  },
  [ROLES.MANAGER]: {
    title: "Store Dashboard",
    description:
      "Welcome back. Here is what's happening across products, stock, and cashier operations today.",
    actions: [
      { label: "Export Data", icon: Download, tone: "ghost", path: "/reports" },
      { label: "Start Z-Report", icon: RefreshCcw, tone: "ghost", path: "/reports" },
      { label: "Review Stock", icon: Box, tone: "primary", path: "/inventory" },
    ],
    chartTitle: "Hourly Sales Trend",
    chartDescription:
      "Hourly gross sales history will render here as soon as the backend exposes time-series sales data.",
    chartBadge: "Awaiting History Feed",
    alertsTitle: "Low Stock Alerts",
    alertsDescription: "Real low-stock products pulled directly from the inventory backend.",
    reviewTitle: "Manager Review",
    reviewDescription: "Operational status from live backend data and system health checks.",
    secondaryActions: [
      { label: "View Reports", icon: ClipboardList, path: "/reports" },
      { label: "Open Inventory", icon: Box, path: "/inventory" },
    ],
  },
};

const DASHBOARD_STATUS_COPY = {
  chartUnavailableTitle: "Sales history not available yet",
  chartUnavailableDescription:
    "The current backend exposes summary totals but not hourly sales snapshots for charting.",
  noLowStockTitle: "No low-stock products currently require intervention.",
  noLowStockDetail: "Inventory levels from the backend are above the configured low-stock threshold.",
  inventoryHealthy: "Inventory synced successfully",
  inventoryAttention: "Inventory sync needs review",
  reportReady: "Last report generated today",
  reportUnavailable: "Sales summary is temporarily unavailable",
  alertsNone: "No urgent stock alerts",
};

const initialDashboardState = {
  todaySales: null,
  transactions: null,
  lowStockCount: null,
  cashierAccounts: null,
  recentTransactions: [],
};

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatMetricValue(key, value) {
  if (value === null || value === undefined) {
    return "--";
  }

  if (key === "todaySales") {
    return formatCurrency(value);
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatTransactionTime(value) {
  if (!value) {
    return "--";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

function normalizeRecentTransactions(data) {
  const rawTransactions =
    data?.recentTransactions ?? data?.latestTransactions ?? data?.transactionsList ?? [];

  if (!Array.isArray(rawTransactions)) {
    return [];
  }

  return rawTransactions
    .map((transaction, index) => {
      const amountCandidates = [
        transaction?.amount,
        transaction?.total,
        transaction?.amountPaid,
        transaction?.saleTotal,
      ];
      const resolvedAmount = amountCandidates.find((candidate) => Number.isFinite(Number(candidate)));
      const amount = resolvedAmount === undefined ? null : Number(resolvedAmount);
      const title =
        transaction?.productName ??
        transaction?.items?.[0]?.product?.name ??
        transaction?.receiptReference ??
        transaction?.receiptNumber ??
        transaction?.reference ??
        transaction?.saleId;

      if (!title || amount === null) {
        return null;
      }

      return {
        id: transaction?.id ?? transaction?.saleId ?? `${title}-${index}`,
        title: String(title),
        amount: formatCurrency(amount),
        paymentMethod:
          transaction?.paymentMethod ??
          transaction?.method ??
          transaction?.payments?.[0]?.method ??
          "Recorded sale",
        time: formatTransactionTime(
          transaction?.createdAt ?? transaction?.paidAt ?? transaction?.timestamp ?? transaction?.time
        ),
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

function Dashboard() {
  const navigate = useNavigate();
  const { userName = "Robert Miller", role = ROLES.MANAGER } = useOutletContext() ?? {};
  const config = DASHBOARD_CONFIG[role] ?? DASHBOARD_CONFIG[ROLES.MANAGER];
  const [dashboardState, setDashboardState] = useState(initialDashboardState);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError("");

      const today = getTodayDateString();

      try {
        const [summaryData, dailySalesData, lowStockData] = await Promise.all([
          getDashboardSummary(),
          getDailySalesReport({ startDate: today, endDate: today }),
          getLowStockProducts(),
        ]);

        if (!isMounted) {
          return;
        }

        setDashboardState({
          todaySales: dailySalesData?.totalSales ?? 0,
          transactions: dailySalesData?.transactions ?? 0,
          lowStockCount: lowStockData.length,
          cashierAccounts: summaryData?.activeCashiers ?? null,
          recentTransactions: normalizeRecentTransactions(summaryData),
        });
        setLowStockProducts(lowStockData);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError.message || "Unable to load dashboard data.");
        setDashboardState((current) => ({
          ...current,
          recentTransactions: [],
        }));
        setLowStockProducts([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = useMemo(
    () => [
      {
        title: "Today's Sales",
        value: formatMetricValue("todaySales", dashboardState.todaySales),
        meta: isLoading ? "Loading live data" : "Live sales report",
        note: "gross revenue for today",
        tone: "blue",
        icon: DollarSign,
      },
      {
        title: "Transactions",
        value: formatMetricValue("transactions", dashboardState.transactions),
        meta: isLoading ? "Loading live data" : "Live sales report",
        note: "completed checkouts today",
        tone: "green",
        icon: ClipboardList,
      },
      {
        title: "Low Stock Items",
        value: formatMetricValue("lowStockCount", dashboardState.lowStockCount),
        meta: isLoading ? "Loading live data" : "Live inventory data",
        note: "products below threshold",
        tone: "sand",
        icon: Box,
      },
      {
        title: "Active Cashiers",
        value: formatMetricValue("cashierAccounts", dashboardState.cashierAccounts),
        meta: isLoading ? "Loading live data" : "Live user data",
        note: "registered cashier records",
        tone: "blue",
        icon: UserCheck,
      },
    ],
    [
      dashboardState.cashierAccounts,
      dashboardState.lowStockCount,
      dashboardState.todaySales,
      dashboardState.transactions,
      isLoading,
    ]
  );

  const alerts = useMemo(() => {
    if (!lowStockProducts.length) {
      return [
        {
          item: DASHBOARD_STATUS_COPY.noLowStockTitle,
          detail: DASHBOARD_STATUS_COPY.noLowStockDetail,
          severity: "neutral",
        },
      ];
    }

    const groupedProducts = lowStockProducts.reduce((groups, product) => {
      const normalizedName = String(product.name ?? "Unnamed Product").trim().toLowerCase();
      const existingGroup = groups.get(normalizedName);

      if (existingGroup) {
        existingGroup.products.push(product);
        existingGroup.skus.add(product.sku ?? `product-${product.id}`);
        existingGroup.minimumStock = Math.min(existingGroup.minimumStock, Number(product.stock) || 0);
        return groups;
      }

      groups.set(normalizedName, {
        label: String(product.name ?? "Unnamed Product").trim(),
        category: product.category?.name ?? "Uncategorized",
        products: [product],
        skus: new Set([product.sku ?? `product-${product.id}`]),
        minimumStock: Number(product.stock) || 0,
      });

      return groups;
    }, new Map());

    return Array.from(groupedProducts.values())
      .sort((left, right) => left.minimumStock - right.minimumStock || left.label.localeCompare(right.label))
      .slice(0, 3)
      .map((group) => {
        const skuCount = group.skus.size;
        const itemLabel = skuCount > 1 ? `${group.label} (${skuCount} SKUs affected)` : group.label;
        const detail =
          skuCount > 1
            ? `${group.minimumStock} units left across ${group.category}`
            : `${group.minimumStock} units left in ${group.category}`;

        return {
          item: itemLabel,
          detail,
          severity: group.minimumStock <= 0 ? "warning" : "info",
        };
      });
  }, [lowStockProducts]);

  const reviewItems = useMemo(() => {
    const salesSummaryReady =
      dashboardState.todaySales !== null && dashboardState.transactions !== null && !error;

    return [
      {
        label: "Inventory Status",
        value: error
          ? DASHBOARD_STATUS_COPY.inventoryAttention
          : DASHBOARD_STATUS_COPY.inventoryHealthy,
      },
      {
        label: "Reporting Status",
        value: salesSummaryReady
          ? DASHBOARD_STATUS_COPY.reportReady
          : DASHBOARD_STATUS_COPY.reportUnavailable,
      },
      {
        label: "Alert Queue",
        value:
          lowStockProducts.length > 0
            ? `${lowStockProducts.length} alerts requiring attention`
            : DASHBOARD_STATUS_COPY.alertsNone,
      },
    ];
  }, [
    dashboardState.todaySales,
    dashboardState.transactions,
    error,
    lowStockProducts.length,
  ]);

  return (
    <section className="manager-content">
      <div className="manager-hero">
        <div>
          <h2>{config.title}</h2>
          <p>{role === ROLES.ADMIN ? `Welcome back, ${userName}. ${config.description}` : config.description}</p>
          {error ? <p>{error}</p> : null}
        </div>

        <div className="manager-hero-actions">
          {isLoading ? (
            <span className="manager-live-badge">
              <LoaderCircle size={14} />
              Loading
            </span>
          ) : null}
          {config.actions.map((action) => {
            const Icon = action.icon;
            const className =
              action.tone === "primary"
                ? "manager-primary-button"
                : action.tone === "secondary"
                  ? "manager-secondary-button"
                  : "manager-ghost-button";

            return (
              <button
                key={action.label}
                type="button"
                className={className}
                onClick={() => navigate(action.path)}
              >
                <Icon size={16} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="manager-stats-grid">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.title} className={`manager-stat-card tone-${card.tone}`}>
              <div className="manager-stat-top">
                <div>
                  <p>{card.title}</p>
                  <h3>{card.value}</h3>
                </div>
                <span className="manager-stat-icon">
                  <Icon size={24} />
                </span>
              </div>
              <div className={`manager-stat-meta ${card.negative ? "negative" : ""}`}>
                <strong>{card.meta}</strong>
                <span>{card.note}</span>
              </div>
            </article>
          );
        })}
      </div>

      <section className="manager-card manager-transactions-card">
        <div className="manager-card-head">
          <div>
            <h3>Recent Transactions Snapshot</h3>
            <p>Latest backend-reported transactions across the store.</p>
          </div>
          <span className="manager-live-badge">Live Snapshot</span>
        </div>

        <div className="manager-transactions-list">
          {dashboardState.recentTransactions.length ? (
            dashboardState.recentTransactions.map((transaction) => (
              <article key={transaction.id} className="manager-transaction-item">
                <div className="manager-transaction-copy">
                  <strong>{transaction.title}</strong>
                  <span>{transaction.paymentMethod}</span>
                </div>
                <div className="manager-transaction-meta">
                  <strong>{transaction.amount}</strong>
                  <span>{transaction.time}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="manager-transactions-empty">No recent transactions yet</div>
          )}
        </div>
      </section>

      <div className="manager-lower-grid">
        <section className="manager-card">
          <div className="manager-card-head compact">
            <div>
              <h3>{config.alertsTitle}</h3>
              <p>{config.alertsDescription}</p>
            </div>
            <TriangleAlert size={18} />
          </div>

          <div className="manager-alert-list">
            {alerts.map((alert) => (
              <article key={alert.item} className="manager-alert-item">
                <div>
                  <strong>{alert.item}</strong>
                  <span>{alert.detail}</span>
                </div>
                <em className={`manager-alert-tone ${alert.severity}`}>
                  {alert.severity === "warning"
                    ? "Action Needed"
                    : alert.severity === "info"
                      ? "Tracked"
                      : "Healthy"}
                </em>
              </article>
            ))}
          </div>
        </section>

        <section className="manager-card">
          <div className="manager-card-head compact">
            <div>
              <h3>{config.reviewTitle}</h3>
              <p>{config.reviewDescription}</p>
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="manager-overview-list">
            {reviewItems.map((item) => (
              <div key={item.label} className="manager-overview-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="manager-review-actions">
            {config.secondaryActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.label}
                  type="button"
                  className="manager-secondary-button"
                  onClick={() => navigate(action.path)}
                >
                  <Icon size={16} />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

export default Dashboard;

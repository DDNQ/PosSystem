import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  Download,
  FileText,
  Filter,
  Printer,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import "../styles/dashboard.css";
import "../styles/reports.css";
import { formatCurrency } from "../utils/currency";
import {
  buildReportExportData,
  exportReportToPdf,
  exportRowsToCsv,
  printReport,
} from "../utils/reportExports";
import {
  getCategories,
  getDailySalesReport,
  getPaymentSummaryReport,
  getProductPerformanceReport,
} from "../services/api";

const methodColors = {
  CARD: "tone-card",
  CASH: "tone-cash",
  MOBILE_MONEY: "tone-wallet",
};

function getMethodSymbol(method) {
  if (method === "CASH") {
    return "$";
  }

  if (method === "MOBILE_MONEY") {
    return "MoMo";
  }

  return "Card";
}

function Reports() {
  const reportTitle = "Daily Sales Report";
  const reportSubtitle = "Complete breakdown of sales by hour and category.";
  const [dailySales, setDailySales] = useState(null);
  const [productPerformance, setProductPerformance] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [storeSection, setStoreSection] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "",
    endDate: "",
    section: "",
    search: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        const categoryData = await getCategories();

        if (!isMounted) {
          return;
        }

        setCategories(categoryData);
      } catch {
        if (!isMounted) {
          return;
        }

        setCategories([]);
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [dailySalesData, productPerformanceData, paymentSummaryData] = await Promise.all([
          getDailySalesReport(appliedFilters),
          getProductPerformanceReport(appliedFilters),
          getPaymentSummaryReport(appliedFilters),
        ]);

        if (!isMounted) {
          return;
        }

        setDailySales(dailySalesData);
        setProductPerformance(productPerformanceData);
        setPaymentSummary(paymentSummaryData);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError.message || "Unable to load reports.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadReports();

    return () => {
      isMounted = false;
    };
  }, [appliedFilters]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      startDate: dateFrom,
      endDate: dateTo,
      section: storeSection.trim(),
      search: searchTerm.trim(),
    });
  };

  const statCards = useMemo(
    () => [
      {
        label: "Total Sales",
        value: formatCurrency(dailySales?.totalSales ?? 0),
        delta: `${dailySales?.transactions ?? 0} sales`,
        tone: "blue",
        icon: BadgeDollarSign,
      },
      {
        label: "Transactions",
        value: String(dailySales?.transactions ?? 0),
        delta: "Daily sales count",
        tone: "slate",
        icon: FileText,
      },
      {
        label: "Average Sale",
        value: formatCurrency(dailySales?.averageSale ?? 0),
        delta: "Per transaction",
        tone: "blue",
        icon: ShoppingCart,
      },
      {
        label: "Payment Methods",
        value: String(paymentSummary.length),
        delta: "Successful summaries",
        tone: "blue",
        icon: TrendingUp,
      },
    ],
    [dailySales, paymentSummary]
  );

  const paymentSummaryTotal = useMemo(
    () =>
      paymentSummary.reduce((sum, item) => sum + (Number(item.totalAmountPaid) || 0), 0),
    [paymentSummary]
  );

  const exportData = useMemo(
    () =>
      buildReportExportData({
        title: reportTitle,
        subtitle: reportSubtitle,
        filters: appliedFilters,
        statCards,
        paymentSummary,
        paymentSummaryTotal,
        productPerformance,
        formatCurrency,
      }),
    [appliedFilters, paymentSummary, paymentSummaryTotal, productPerformance, reportSubtitle, reportTitle, statCards]
  );

  const exportTimestamp = useMemo(() => {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("-")
  }, []);

  const handlePrint = () => {
    printReport(exportData)
  }

  const handleExportCsv = () => {
    exportRowsToCsv({
      filename: `daily-sales-report-${exportTimestamp}.csv`,
      headers: ["Product ID", "Product", "SKU", "Current Price", "Quantity Sold", "Revenue"],
      rows: exportData.tableRows.map((row) => [
        row.productId,
        row.product,
        row.sku,
        row.currentPrice,
        row.quantitySold,
        row.revenue,
      ]),
    })
  }

  const handleExportPdf = () => {
    exportReportToPdf({
      filename: `daily-sales-report-${exportTimestamp}.pdf`,
      ...exportData,
    })
  }

  return (
    <section className="reports-shell">
      <div className="reports-main">
        <div className="reports-hero">
          <div>
            <p className="reports-eyebrow">Sales</p>
            <h2>{reportTitle}</h2>
            <span>{reportSubtitle}</span>
          </div>

          <div className="reports-hero-actions">
            <button
              type="button"
              className="reports-action-button"
              onClick={handlePrint}
              disabled={isLoading}
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button
              type="button"
              className="reports-action-button"
              onClick={handleExportPdf}
              disabled={isLoading}
            >
              <Download size={16} />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              className="reports-primary-button"
              onClick={handleExportCsv}
              disabled={isLoading}
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <section className="reports-filter-bar">
          <div className="reports-filter-field">
            <label>Date Range</label>
            <div className="reports-input-shell reports-date-range-shell">
              <CalendarDays size={16} />
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                aria-label="Start date"
              />
              <span className="reports-date-range-divider">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                aria-label="End date"
              />
            </div>
          </div>

          <div className="reports-filter-field narrow">
            <label>Store Section</label>
            <div className="reports-input-shell">
              <select
                value={storeSection}
                onChange={(event) => setStoreSection(event.target.value)}
                aria-label="Store section"
              >
                <option value="">All sections</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="reports-filter-field">
            <label>Search</label>
            <div className="reports-input-shell">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Product, SKU, cashier..."
              />
            </div>
          </div>

          <button
            type="button"
            className="reports-filter-button"
            disabled={isLoading}
            onClick={handleApplyFilters}
          >
            <Filter size={16} />
            <span>{isLoading ? "Refreshing..." : "Apply Filters"}</span>
          </button>
        </section>

        {isLoading ? <div className="reports-feedback">Loading reports from the backend...</div> : null}
        {!isLoading && error ? <div className="reports-feedback reports-feedback-error">{error}</div> : null}

        <div className="reports-stat-grid">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.label} className="reports-stat-card">
                <div className="reports-stat-top">
                  <span className={`reports-stat-icon ${card.tone}`}>
                    <Icon size={16} />
                  </span>
                  <em className={card.negative ? "negative" : ""}>{card.delta}</em>
                </div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </article>
            );
          })}
        </div>

        <section className="reports-table-card">
          <div className="reports-table-head">
            <div>
              <h3>Product Performance</h3>
              <p>Top-selling products based on backend sales history.</p>
            </div>
            <span className="reports-records-badge">{productPerformance.length} Products</span>
          </div>

          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Price</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && !error && !productPerformance.length ? (
                  <tr>
                    <td colSpan="6">No product performance data available yet.</td>
                  </tr>
                ) : (
                  productPerformance.map((row) => (
                    <tr key={row.productId}>
                      <td className="reports-transaction-id">#{row.productId}</td>
                      <td>{row.name ?? "Unknown Product"}</td>
                      <td>{row.sku ?? "N/A"}</td>
                      <td>{formatCurrency(row.currentPrice ?? 0)}</td>
                      <td>{row.quantitySold ?? 0}</td>
                      <td className="reports-total-amount">{formatCurrency(row.revenue ?? 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="reports-table-footer">
            <span>
              Showing {productPerformance.length ? 1 : 0}-{productPerformance.length} of {productPerformance.length} entries
            </span>
            <div className="reports-pagination">
              <button type="button" className="is-active">
                1
              </button>
              <button type="button" disabled>
                Next
              </button>
            </div>
          </div>
        </section>

        <section className="reports-tip-card">
          <span className="reports-tip-icon">
            <FileText size={18} />
          </span>
          <div>
            <strong>Payment Summary</strong>
            {paymentSummary.length ? (
              <div className="reports-payment-summary">
                {paymentSummary.map((payment) => (
                  <div key={payment.method} className="reports-payment-row">
                    <span className={`reports-method-icon ${methodColors[payment.method]}`}>
                      {getMethodSymbol(payment.method)}
                    </span>
                    <div className="reports-payment-copy">
                      <strong>{payment.method.replaceAll("_", " ")}</strong>
                      <p>
                        {payment.transactions} transactions, change {formatCurrency(payment.totalChangeGiven ?? 0)}
                      </p>
                    </div>
                    <b>{formatCurrency(payment.totalAmountPaid ?? 0)}</b>
                  </div>
                ))}
                <button type="button">Total Collected: {formatCurrency(paymentSummaryTotal)}</button>
              </div>
            ) : (
              <p>No successful payment summary data available yet.</p>
            )}
          </div>
        </section>

        <footer className="reports-footer">
          <div className="reports-footer-status">
            <span className="terminal-status-dot" aria-hidden="true" />
            <span>System Connected</span>
          </div>
          <div className="reports-footer-session">
            Current Session: <strong>{formatCurrency(dailySales?.totalSales ?? 0)}</strong>
          </div>
          <div className="reports-footer-copy">
            <span>&copy; 2024 Supermarket POS</span>
            <button type="button">Keyboard Shortcuts</button>
          </div>
        </footer>
      </div>
    </section>
  );
}

export default Reports;

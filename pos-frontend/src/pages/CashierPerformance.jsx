import { useEffect, useMemo, useState } from "react";
import { Activity, Download, Search, TrendingUp } from "lucide-react";
import "../styles/dashboard.css";
import "../styles/reports.css";
import "../styles/role-pages.css";
import { getCashierPerformanceAnalytics } from "../services/api";
import { formatCurrency } from "../utils/currency";

function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(2)}%`;
}

function formatGhanaCurrency(value) {
  return formatCurrency(Number(value ?? 0)).replace(/^GH₵|^GHS/i, "GH\u00A2");
}

function CashierPerformance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState({
    topAccuracy: 0,
    shiftThroughput: 0,
    averageRefundRate: 0,
  });
  const [cashiers, setCashiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCashierPerformance = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await getCashierPerformanceAnalytics();

        if (!isMounted) {
          return;
        }

        setSummary({
          topAccuracy: data.summary?.topAccuracy ?? 0,
          shiftThroughput: data.summary?.shiftThroughput ?? 0,
          averageRefundRate: data.summary?.averageRefundRate ?? 0,
        });
        setCashiers(data.cashiers ?? []);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError.message || "Unable to load cashier performance.");
        setSummary({
          topAccuracy: 0,
          shiftThroughput: 0,
          averageRefundRate: 0,
        });
        setCashiers([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCashierPerformance();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCashiers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return cashiers;
    }

    return cashiers.filter((cashier) =>
      `${cashier.name} ${cashier.transactions} ${cashier.avgBasket} ${cashier.refundRate} ${cashier.accuracy}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [cashiers, searchTerm]);

  const isCompactTable =
    !isLoading && !searchTerm.trim() && cashiers.length > 0 && cashiers.length <= 2;

  return (
    <section className="manager-content">
      <div className="manager-hero">
        <div>
          <h2>Cashier Performance</h2>
          <p>Monitor transaction throughput, basket quality, refund rate, and checkout accuracy.</p>
          {error ? <p>{error}</p> : null}
        </div>

        <div className="manager-hero-actions">
          <button type="button" className="manager-ghost-button">
            <Activity size={16} />
            <span>Live Floor View</span>
          </button>
          <button type="button" className="manager-primary-button">
            <Download size={16} />
            <span>Export Metrics</span>
          </button>
        </div>
      </div>

      <div className="role-stat-grid">
        <article className="role-stat-card">
          <span>Top Accuracy</span>
          <strong>{isLoading ? "--" : formatPercent(summary.topAccuracy)}</strong>
          <p>{isLoading ? "Loading analytics..." : "Best cashier this shift"}</p>
        </article>
        <article className="role-stat-card">
          <span>Shift Throughput</span>
          <strong>{isLoading ? "--" : summary.shiftThroughput}</strong>
          <p>{isLoading ? "Loading analytics..." : "Total transactions today"}</p>
        </article>
        <article className="role-stat-card">
          <span>Average Refund Rate</span>
          <strong>{isLoading ? "--" : formatPercent(summary.averageRefundRate)}</strong>
          <p>{isLoading ? "Loading analytics..." : "Across active cashiers"}</p>
        </article>
      </div>

      <section
        className={`reports-table-card cashier-performance-table-card${
          isCompactTable ? " is-compact" : ""
        }`}
      >
        <div className="reports-table-head">
          <div>
            <h3>Frontline Performance Table</h3>
            <p>Daily cashier visibility to support coaching and staffing decisions.</p>
          </div>
          <div className="role-inline-search">
            <Search size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search cashier..."
              aria-label="Search cashier performance"
            />
          </div>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Cashier</th>
                <th>Transactions</th>
                <th>Avg Basket</th>
                <th>Refund Rate</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5">Loading cashier performance from the backend...</td>
                </tr>
              ) : !filteredCashiers.length ? (
                searchTerm.trim() ? (
                  <tr>
                    <td colSpan="5">No matching cashier performance found.</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="5" className="role-table-empty-cell">
                      <div className="role-table-empty-state">
                        <strong>No cashier performance data yet</strong>
                        <p>
                          Cashier analytics will appear here after completed sales are recorded for
                          active cashiers.
                        </p>
                      </div>
                    </td>
                  </tr>
                )
              ) : (
                filteredCashiers.map((cashier) => (
                  <tr key={cashier.id}>
                    <td className="role-entity-cell">
                      <span className="role-entity-icon">
                        <TrendingUp size={16} />
                      </span>
                      <strong>{cashier.name}</strong>
                    </td>
                    <td>{cashier.transactions}</td>
                    <td className="reports-total-amount">{formatGhanaCurrency(cashier.avgBasket)}</td>
                    <td>{formatPercent(cashier.refundRate)}</td>
                    <td>
                      <span className="reports-terminal-chip">{formatPercent(cashier.accuracy)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export default CashierPerformance;

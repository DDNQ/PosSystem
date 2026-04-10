import { useEffect, useMemo, useState } from "react";
import { Download, History, Search, Users } from "lucide-react";
import "../styles/dashboard.css";
import "../styles/reports.css";
import "../styles/role-pages.css";
import { formatCurrency } from "../utils/currency";
import { getCustomerHistoryAnalytics } from "../services/api";

function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function formatPurchaseDate(value) {
  if (!value) {
    return "--";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsedDate);
}

function CustomerHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState({
    returningCustomers: 0,
    returningCustomersPercent: 0,
    loyaltySignups: 0,
    averageRepeatSpend: 0,
  });
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCustomerHistory = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await getCustomerHistoryAnalytics();

        if (!isMounted) {
          return;
        }

        setSummary({
          returningCustomers: data.summary?.returningCustomers ?? 0,
          returningCustomersPercent: data.summary?.returningCustomersPercent ?? 0,
          loyaltySignups: data.summary?.loyaltySignups ?? 0,
          averageRepeatSpend: data.summary?.averageRepeatSpend ?? 0,
        });
        setHistory(data.history ?? []);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError.message || "Unable to load customer history.");
        setSummary({
          returningCustomers: 0,
          returningCustomersPercent: 0,
          loyaltySignups: 0,
          averageRepeatSpend: 0,
        });
        setHistory([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCustomerHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredHistory = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return history;
    }

    return history.filter((customer) =>
      `${customer.name} ${customer.segment} ${customer.visits} ${customer.totalSpend}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [history, searchTerm]);

  return (
    <section className="manager-content">
      <div className="manager-hero">
        <div>
          <h2>Customer History</h2>
          <p>Review purchase frequency, repeat visits, and top-value shoppers at the store level.</p>
          {error ? <p>{error}</p> : null}
        </div>

        <div className="manager-hero-actions">
          <button type="button" className="manager-ghost-button">
            <History size={16} />
            <span>Repeat Buyers</span>
          </button>
          <button type="button" className="manager-primary-button">
            <Download size={16} />
            <span>Export History</span>
          </button>
        </div>
      </div>

      <div className="role-stat-grid">
        <article className="role-stat-card">
          <span>Returning Customers</span>
          <strong>{isLoading ? "--" : formatPercent(summary.returningCustomersPercent)}</strong>
          <p>
            {isLoading
              ? "Loading analytics..."
              : summary.returningCustomers > 0
                ? `${summary.returningCustomers} repeat customers tracked`
                : "No repeat customers tracked yet"}
          </p>
        </article>
        <article className="role-stat-card">
          <span>Loyalty Signups</span>
          <strong>{isLoading ? "--" : summary.loyaltySignups}</strong>
          <p>
            {isLoading
              ? "Loading analytics..."
              : summary.loyaltySignups > 0
                ? "Customers with loyalty enrollment activity"
                : "No loyalty enrollments recorded yet"}
          </p>
        </article>
        <article className="role-stat-card">
          <span>Average Repeat Spend</span>
          <strong>{isLoading ? "--" : formatCurrency(summary.averageRepeatSpend)}</strong>
          <p>
            {isLoading
              ? "Loading analytics..."
              : summary.averageRepeatSpend > 0
                ? "Per returning customer"
                : "Awaiting repeat purchase data"}
          </p>
        </article>
      </div>

      <section className="reports-table-card">
        <div className="reports-table-head">
          <div>
            <h3>Purchase History Snapshot</h3>
            <p>Recent customer behavior and lifetime-value visibility for managers.</p>
          </div>
          <div className="role-inline-search">
            <Search size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search customer..."
              aria-label="Search customer history"
            />
          </div>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Visits</th>
                <th>Last Purchase</th>
                <th>Total Spend</th>
                <th>Segment</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5">Loading customer history from the backend...</td>
                </tr>
              ) : !filteredHistory.length ? (
                searchTerm.trim() ? (
                  <tr>
                    <td colSpan="5">No matching customer history found.</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="5" className="role-table-empty-cell">
                      <div className="role-table-empty-state">
                        <strong>No customer purchase history yet</strong>
                        <p>
                          Customer transactions will appear here after completed sales linked to
                          customer profiles.
                        </p>
                      </div>
                    </td>
                  </tr>
                )
              ) : (
                filteredHistory.map((customer) => (
                  <tr key={customer.id}>
                    <td className="role-entity-cell">
                      <span className="role-entity-icon">
                        <Users size={16} />
                      </span>
                      <strong>{customer.name}</strong>
                    </td>
                    <td>{customer.visits}</td>
                    <td>{formatPurchaseDate(customer.lastPurchase)}</td>
                    <td className="reports-total-amount">{formatCurrency(customer.totalSpend)}</td>
                    <td>
                      <span className="reports-terminal-chip">{customer.segment}</span>
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

export default CustomerHistory;

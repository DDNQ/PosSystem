import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Download, ReceiptText, Search, X } from "lucide-react";
import "../styles/dashboard.css";
import "../styles/reports.css";
import "../styles/role-pages.css";
import { getAdminSalesOverview, getReceipt } from "../services/api";
import { formatCurrency } from "../utils/currency";

function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function formatSaleDate(value) {
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

function formatSaleDateTime(value) {
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
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

function getPaymentMethodLabel(method) {
  if (!method) {
    return "--";
  }

  return String(method)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function escapeCsvValue(value) {
  const normalizedValue = String(value ?? "");

  if (/[",\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
}

function getExportDateLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function AllSales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState({
    totalSalesToday: 0,
    totalTransactions: 0,
    refundRate: 0,
  });
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState(null);
  const [detailsError, setDetailsError] = useState("");
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAdminSales = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await getAdminSalesOverview();

        if (!isMounted) {
          return;
        }

        setSummary({
          totalSalesToday: data.summary?.totalSalesToday ?? 0,
          totalTransactions: data.summary?.totalTransactions ?? 0,
          refundRate: data.summary?.refundRate ?? 0,
        });
        setSales(data.sales ?? []);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError.message || "Unable to load sales overview.");
        setSummary({
          totalSalesToday: 0,
          totalTransactions: 0,
          refundRate: 0,
        });
        setSales([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAdminSales();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSales = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return sales;
    }

    return sales.filter((sale) =>
      `${sale.receiptNumber} ${sale.cashier} ${sale.terminal ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [sales, searchTerm]);

  const currentViewSummary = useMemo(() => {
    const displayedSalesTotal = filteredSales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
    const refundedSalesCount = filteredSales.filter((sale) => sale.status === "Refunded").length;
    const completedSalesCount = filteredSales.filter((sale) => sale.status === "Completed").length;
    const activeTerminalCount = new Set(
      filteredSales
        .map((sale) => String(sale.terminal ?? "").trim())
        .filter(Boolean)
    ).size;

    return {
      totalSalesToday: summary.totalSalesToday,
      totalTransactions: filteredSales.length,
      refundRate:
        filteredSales.length > 0 ? (refundedSalesCount / filteredSales.length) * 100 : 0,
      displayedSalesTotal,
      refundedSalesCount,
      completedSalesCount,
      activeTerminalCount,
    };
  }, [filteredSales, summary.totalSalesToday]);

  const handleOpenSaleDetails = async (sale) => {
    setSelectedSale(sale);
    setSaleDetails(null);
    setDetailsError("");
    setIsDetailsLoading(true);

    try {
      const receipt = await getReceipt(sale.id);

      setSaleDetails(receipt);
    } catch (requestError) {
      setDetailsError(requestError.message || "Unable to load sale details.");
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleCloseSaleDetails = () => {
    setSelectedSale(null);
    setSaleDetails(null);
    setDetailsError("");
    setIsDetailsLoading(false);
  };

  const handleExportSales = () => {
    const csvHeaders = [
      "Receipt Number",
      "Date",
      "Cashier",
      "Terminal",
      "Items Count",
      "Total",
      "Status",
    ];
    const csvRows = filteredSales.map((sale) => [
      sale.receiptNumber,
      formatSaleDateTime(sale.date),
      sale.cashier || "",
      sale.terminal || "",
      sale.itemsCount ?? 0,
      Number(sale.total ?? 0).toFixed(2),
      sale.status || "",
    ]);
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");
    const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = `sales-ledger-${getExportDateLabel()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  const paymentMethod = saleDetails?.payments?.[0]?.method ?? null;

  return (
    <>
      <section className="manager-content">
        <div className="manager-hero">
          <div>
            <h2>All Sales</h2>
            <p>Admin visibility into every transaction, cashier, terminal, and sales outcome.</p>
            {error ? <p>{error}</p> : null}
          </div>

          <div className="manager-hero-actions">
            <button
              type="button"
              className="manager-ghost-button"
              onClick={() => setIsSummaryOpen(true)}
            >
              <ReceiptText size={16} />
              <span>Daily Summary</span>
            </button>
            <button
              type="button"
              className="manager-primary-button"
              onClick={handleExportSales}
            >
              <Download size={16} />
              <span>Export Sales</span>
            </button>
          </div>
        </div>

        <div className="role-stat-grid">
          <article className="role-stat-card">
            <span>Total Sales Today</span>
            <strong>{isLoading ? "--" : formatCurrency(summary.totalSalesToday)}</strong>
            <p>{isLoading ? "Loading sales totals..." : "Across completed sales for today"}</p>
          </article>
          <article className="role-stat-card">
            <span>Total Transactions</span>
            <strong>{isLoading ? "--" : summary.totalTransactions}</strong>
            <p>{isLoading ? "Loading transaction counts..." : "All recorded sales transactions"}</p>
          </article>
          <article className="role-stat-card">
            <span>Refund Rate</span>
            <strong>{isLoading ? "--" : formatPercent(summary.refundRate)}</strong>
            <p>{isLoading ? "Loading refund performance..." : "Percentage of sales marked refunded"}</p>
          </article>
        </div>

        <section className="reports-table-card">
          <div className="reports-table-head">
            <div>
              <h3>Sales Ledger</h3>
              <p>Complete transaction history available to administrators.</p>
            </div>
            <div className="role-inline-search">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search receipt, cashier, terminal..."
                aria-label="Search all sales"
              />
            </div>
          </div>

          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Receipt / Sale</th>
                  <th>Date</th>
                  <th>Cashier</th>
                  <th>Terminal</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7">Loading sales overview from the backend...</td>
                  </tr>
                ) : !filteredSales.length ? (
                  searchTerm.trim() ? (
                    <tr>
                      <td colSpan="7">No matching sales were found.</td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="7" className="role-table-empty-cell">
                        <div className="role-table-empty-state">
                          <strong>No sales have been recorded yet</strong>
                          <p>
                            Completed and refunded transactions will appear here once activity starts
                            flowing through the POS.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                ) : (
                  filteredSales.map((row) => (
                    <tr
                      key={row.id}
                      className="reports-table-row-button"
                      onClick={() => handleOpenSaleDetails(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleOpenSaleDetails(row);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open details for ${row.receiptNumber}`}
                    >
                      <td className="reports-transaction-id">{row.receiptNumber}</td>
                      <td>{formatSaleDate(row.date)}</td>
                      <td>{row.cashier || "--"}</td>
                      <td>
                        <span className="reports-terminal-chip">{row.terminal || "--"}</span>
                      </td>
                      <td>{row.itemsCount ?? 0}</td>
                      <td className="reports-total-amount">{formatCurrency(row.total ?? 0)}</td>
                      <td>
                        <span
                          className={`reports-status-pill ${
                            row.status === "Refunded" ? "danger" : "neutral"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reports-tip-card">
          <span className="reports-tip-icon">
            <ClipboardList size={18} />
          </span>
          <div>
            <strong>Audit-Friendly View</strong>
            <p>
              This screen centralizes all store sales so admins can reconcile reports,
              investigate discrepancies, and validate operational activity quickly.
            </p>
          </div>
        </section>
      </section>

      {selectedSale ? (
        <div className="ui-modal-backdrop" onClick={handleCloseSaleDetails}>
          <div
            className="ui-modal reports-sale-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sale-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ui-modal-header reports-sale-modal-header">
              <div>
                <h3 id="sale-details-title">Sale Details</h3>
                <p>Review receipt-level information, payment method, and purchased items.</p>
              </div>
              <button
                type="button"
                className="manager-icon-button"
                onClick={handleCloseSaleDetails}
                aria-label="Close sale details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ui-modal-body reports-sale-modal-body">
              {isDetailsLoading ? (
                <div className="reports-sale-modal-empty">Loading sale details from the backend...</div>
              ) : detailsError ? (
                <div className="reports-sale-modal-empty">{detailsError}</div>
              ) : (
                <>
                  <div className="reports-sale-summary-grid">
                    <article className="reports-sale-summary-card">
                      <span>Receipt Number</span>
                      <strong>{saleDetails?.receiptNumber || selectedSale.receiptNumber}</strong>
                    </article>
                    <article className="reports-sale-summary-card">
                      <span>Date</span>
                      <strong>{formatSaleDateTime(saleDetails?.date || selectedSale.date)}</strong>
                    </article>
                    <article className="reports-sale-summary-card">
                      <span>Cashier</span>
                      <strong>{saleDetails?.cashier?.name || selectedSale.cashier || "--"}</strong>
                    </article>
                    <article className="reports-sale-summary-card">
                      <span>Terminal</span>
                      <strong>{selectedSale.terminal || "--"}</strong>
                    </article>
                    <article className="reports-sale-summary-card">
                      <span>Payment Method</span>
                      <strong>{getPaymentMethodLabel(paymentMethod)}</strong>
                    </article>
                    <article className="reports-sale-summary-card">
                      <span>Status</span>
                      <strong>{selectedSale.status}</strong>
                    </article>
                  </div>

                  <div className="reports-sale-items-card">
                    <div className="reports-sale-items-head">
                      <h4>Item List</h4>
                      <span>{saleDetails?.items?.length ?? selectedSale.itemsCount ?? 0} lines</span>
                    </div>

                    <div className="reports-table-wrap">
                      <table className="reports-table reports-sale-items-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>SKU</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(saleDetails?.items ?? []).map((item) => (
                            <tr key={item.id}>
                              <td className="reports-sale-item-name">{item.name || "--"}</td>
                              <td>{item.sku || "--"}</td>
                              <td>{item.quantity ?? 0}</td>
                              <td>{formatCurrency(item.unitPrice ?? 0)}</td>
                              <td className="reports-total-amount">
                                {formatCurrency(item.total ?? 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="reports-sale-totals-card">
                    <div>
                      <span>Subtotal</span>
                      <strong>{formatCurrency(saleDetails?.subtotal ?? 0)}</strong>
                    </div>
                    <div>
                      <span>Tax</span>
                      <strong>{formatCurrency(saleDetails?.tax ?? 0)}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{formatCurrency(saleDetails?.total ?? selectedSale.total ?? 0)}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isSummaryOpen ? (
        <div className="ui-modal-backdrop" onClick={() => setIsSummaryOpen(false)}>
          <div
            className="ui-modal reports-sale-modal reports-summary-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-summary-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ui-modal-header reports-sale-modal-header">
              <div>
                <h3 id="daily-summary-title">Daily Summary</h3>
                <p>Backend-driven overview for the sales currently shown in this ledger view.</p>
              </div>
              <button
                type="button"
                className="manager-icon-button"
                onClick={() => setIsSummaryOpen(false)}
                aria-label="Close daily summary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ui-modal-body reports-sale-modal-body">
              <div className="reports-sale-summary-grid">
                <article className="reports-sale-summary-card">
                  <span>Total Sales Today</span>
                  <strong>{isLoading ? "--" : formatCurrency(currentViewSummary.totalSalesToday)}</strong>
                </article>
                <article className="reports-sale-summary-card">
                  <span>Total Transactions</span>
                  <strong>{isLoading ? "--" : currentViewSummary.totalTransactions}</strong>
                </article>
                <article className="reports-sale-summary-card">
                  <span>Refund Rate</span>
                  <strong>{isLoading ? "--" : formatPercent(currentViewSummary.refundRate)}</strong>
                </article>
                <article className="reports-sale-summary-card">
                  <span>Displayed Sales Value</span>
                  <strong>{isLoading ? "--" : formatCurrency(currentViewSummary.displayedSalesTotal)}</strong>
                </article>
                <article className="reports-sale-summary-card">
                  <span>Completed Sales</span>
                  <strong>{isLoading ? "--" : currentViewSummary.completedSalesCount}</strong>
                </article>
                <article className="reports-sale-summary-card">
                  <span>Refunded Sales</span>
                  <strong>{isLoading ? "--" : currentViewSummary.refundedSalesCount}</strong>
                </article>
                <article className="reports-sale-summary-card">
                  <span>Active Terminals</span>
                  <strong>{isLoading ? "--" : currentViewSummary.activeTerminalCount}</strong>
                </article>
                <article className="reports-sale-summary-card">
                  <span>Search Context</span>
                  <strong>{searchTerm.trim() || "All Sales"}</strong>
                </article>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default AllSales;

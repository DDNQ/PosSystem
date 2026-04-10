import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Info,
  LogOut,
  Monitor,
  Package2,
  RefreshCcw,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";
import "../styles/pos.css";
import "../styles/returns.css";
import { createReturn, getReturnReceipt } from "../services/api";
import { formatCurrency } from "../utils/currency";
import { clearStoredUser, getStoredUser } from "../utils/auth";

const refundMethods = [
  { id: "original", label: "Original Payment", icon: CreditCard },
  { id: "cash", label: "Cash Refund", icon: CircleDollarSign },
  { id: "credit", label: "Store Credit", icon: RotateCcw },
];

const refundMethodMap = {
  original: "ORIGINAL_PAYMENT",
  cash: "CASH_REFUND",
  credit: "STORE_CREDIT",
};

function getCashierDisplayName(user) {
  return user?.name?.trim() || user?.fullName?.trim() || "Cashier";
}

function getCashierInitials(name) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "CA";
}

function formatTransactionDate(value) {
  if (!value) {
    return "Not loaded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not loaded";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getPaymentMethodLabel(method) {
  if (!method) {
    return "Not loaded";
  }

  return method
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function mapReceiptItems(items) {
  return (items ?? []).map((item) => ({
    productId: item.productId,
    name: item.name,
    sku: item.sku || "No SKU",
    unitPrice: Number(item.unitPrice ?? 0),
    quantityPurchased: Number(item.quantityPurchased ?? 0),
    quantityAlreadyReturned: Number(item.quantityAlreadyReturned ?? 0),
    quantityEligible: Number(item.quantityEligible ?? 0),
    qtyToReturn: 0,
    selected: false,
  }));
}

function Returns() {
  const navigate = useNavigate();
  const [cashierName, setCashierName] = useState("Cashier");
  const [receiptSearch, setReceiptSearch] = useState("");
  const [refundMethod, setRefundMethod] = useState("original");
  const [loadedReceipt, setLoadedReceipt] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [lookupError, setLookupError] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    setCashierName(getCashierDisplayName(storedUser));
  }, []);

  const purchasedSubtotal = useMemo(() => {
    return returnItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantityPurchased,
      0
    );
  }, [returnItems]);

  const refundSubtotal = useMemo(() => {
    return returnItems.reduce((sum, item) => {
      if (!item.selected || item.qtyToReturn <= 0) {
        return sum;
      }

      return sum + item.unitPrice * item.qtyToReturn;
    }, 0);
  }, [returnItems]);

  const effectiveTaxRate = useMemo(() => {
    if (!loadedReceipt || purchasedSubtotal <= 0) {
      return 0;
    }

    const rawRate = (loadedReceipt.originalTotal - purchasedSubtotal) / purchasedSubtotal;
    return rawRate > 0 ? rawRate : 0;
  }, [loadedReceipt, purchasedSubtotal]);

  const taxAdjustment = refundSubtotal * effectiveTaxRate;
  const totalRefund = refundSubtotal + taxAdjustment;

  const selectedReturnItems = useMemo(() => {
    return returnItems.filter((item) => item.selected && item.qtyToReturn > 0);
  }, [returnItems]);

  const handleToggleItem = (productId) => {
    setReturnItems((currentItems) =>
      currentItems.map((item) => {
        if (item.productId !== productId || item.quantityEligible <= 0) {
          return item;
        }

        const nextSelected = !item.selected;

        return {
          ...item,
          selected: nextSelected,
          qtyToReturn: nextSelected ? Math.max(1, item.qtyToReturn) : 0,
        };
      })
    );
  };

  const handleIncreaseQty = (productId) => {
    setReturnItems((currentItems) =>
      currentItems.map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        const nextQty = Math.min(item.quantityEligible, item.qtyToReturn + 1);

        return {
          ...item,
          selected: nextQty > 0,
          qtyToReturn: nextQty,
        };
      })
    );
  };

  const handleDecreaseQty = (productId) => {
    setReturnItems((currentItems) =>
      currentItems.map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        const nextQty = Math.max(0, item.qtyToReturn - 1);

        return {
          ...item,
          selected: nextQty > 0,
          qtyToReturn: nextQty,
        };
      })
    );
  };

  const loadReceipt = async () => {
    const trimmedReceiptNumber = receiptSearch.trim();

    if (!trimmedReceiptNumber) {
      setLookupError("Enter a receipt number to load a transaction.");
      setLookupMessage("");
      setSubmitError("");
      setSuccessMessage("");
      setLoadedReceipt(null);
      setReturnItems([]);
      return;
    }

    setIsLookupLoading(true);
    setLookupError("");
    setLookupMessage("");
    setSubmitError("");
    setSuccessMessage("");

    try {
      const receipt = await getReturnReceipt(trimmedReceiptNumber);

      setLoadedReceipt(receipt);
      setReturnItems(mapReceiptItems(receipt.items));
      setLookupMessage(`Receipt ${receipt.receiptNumber} loaded successfully.`);
      setRefundMethod("original");
    } catch (error) {
      setLoadedReceipt(null);
      setReturnItems([]);
      setLookupMessage("");
      setLookupError(error.message || "Unable to load that receipt.");
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleSubmitReturn = async () => {
    if (!loadedReceipt) {
      setSubmitError("Load a valid receipt before finalizing a return.");
      setSuccessMessage("");
      return;
    }

    if (selectedReturnItems.length === 0) {
      setSubmitError("Select at least one eligible item to return.");
      setSuccessMessage("");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      await createReturn({
        saleId: loadedReceipt.saleId,
        items: selectedReturnItems.map((item) => ({
          productId: item.productId,
          quantity: item.qtyToReturn,
        })),
        refundMethod: refundMethodMap[refundMethod],
      });

      setSuccessMessage("Return processed successfully.");
      setLookupError("");
      setLookupMessage("");
      setLoadedReceipt(null);
      setReturnItems([]);
      setReceiptSearch("");
      setRefundMethod("original");
    } catch (error) {
      setSubmitError(error.message || "Unable to process the return.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearStoredUser();
    navigate("/");
  };

  return (
    <main className="terminal-shell">
      <section className="terminal-frame">
        <header className="terminal-header">
          <div className="terminal-brand">
            <div className="terminal-brand-mark">
              <Package2 size={21} />
            </div>
            <h1>Supermarket POS</h1>
            <div className="terminal-chip">
              <Monitor size={15} />
              <span>Terminal: POS-04</span>
            </div>
          </div>

          <div className="terminal-header-actions">
            <button type="button" className="terminal-icon-button" aria-label="Notifications">
              <Bell size={18} />
              <span className="terminal-notification-dot" aria-hidden="true" />
            </button>

            <div className="terminal-user-block">
              <div className="terminal-user-copy">
                <strong>{cashierName}</strong>
                <span>Cashier</span>
              </div>
              <div className="terminal-user-avatar">{getCashierInitials(cashierName)}</div>
            </div>

            <button
              type="button"
              className="terminal-icon-button"
              aria-label="Log out"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <section className="returns-shell">
          <div className="returns-page-header">
            <div className="returns-page-title">
              <button
                type="button"
                className="returns-back-button"
                onClick={() => navigate("/pos")}
              >
                <ArrowLeft size={18} />
                <span>Back to Terminal</span>
              </button>
              <div className="returns-page-title-copy">
                <h2>Process Returns</h2>
                <p>Review the transaction, select eligible items, and finalize the refund.</p>
              </div>
            </div>

            <div className="returns-session-chips">
              <span>Session ID: SES-4410</span>
              <span>Last Return: 14:02 PM</span>
            </div>
          </div>

          <div className="returns-top-grid">
            <section className="returns-search-card">
              <p className="returns-label">Receipt Search</p>
              <div className="returns-search-row">
                <label className="returns-search-input">
                  <Search size={18} />
                  <input
                    type="text"
                    value={receiptSearch}
                    onChange={(event) => setReceiptSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        loadReceipt();
                      }
                    }}
                    placeholder="Enter receipt number"
                    aria-label="Search receipt"
                  />
                </label>
                <button
                  type="button"
                  className="returns-load-button"
                  onClick={loadReceipt}
                  disabled={isLookupLoading}
                >
                  {isLookupLoading ? "Loading..." : "Load Transaction"}
                </button>
              </div>
              {lookupMessage ? (
                <div className="returns-feedback success">{lookupMessage}</div>
              ) : null}
              {lookupError ? <div className="returns-feedback error">{lookupError}</div> : null}
              {successMessage ? (
                <div className="returns-feedback success">{successMessage}</div>
              ) : null}
              {submitError ? <div className="returns-feedback error">{submitError}</div> : null}
            </section>

            <section className="returns-order-card">
              <div className="returns-order-grid">
                <div className="returns-order-item">
                  <span>
                    <CalendarDays size={15} />
                    Date
                  </span>
                  <strong>{formatTransactionDate(loadedReceipt?.date)}</strong>
                </div>
                <div className="returns-order-item">
                  <span>
                    <UserRound size={15} />
                    Customer
                  </span>
                  <strong>{loadedReceipt?.customer || "Walk-in Customer"}</strong>
                </div>
                <div className="returns-order-item">
                  <span>
                    <CreditCard size={15} />
                    Original Total
                  </span>
                  <strong className="accent">
                    {formatCurrency(loadedReceipt?.originalTotal ?? 0)}
                  </strong>
                </div>
                <div className="returns-order-item">
                  <span>
                    <Package2 size={15} />
                    Items Count
                  </span>
                  <strong>{loadedReceipt ? `${loadedReceipt.itemsCount} items` : "0 items"}</strong>
                </div>
                <div className="returns-order-item">
                  <span>
                    <RefreshCcw size={15} />
                    Payment Method
                  </span>
                  <strong>{getPaymentMethodLabel(loadedReceipt?.paymentMethod)}</strong>
                </div>
              </div>
            </section>
          </div>

          <div className="returns-main-grid">
            <section className="returns-items-panel">
              <div className="returns-section-head">
                <div className="returns-section-title">
                  <RotateCcw size={18} />
                  <h3>Select Items for Return</h3>
                </div>
                <span>Only items within 30 days are eligible</span>
              </div>

              <div className="returns-table-wrap">
                <table className="returns-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Product Information</th>
                      <th>Price</th>
                      <th>Qty Purchased</th>
                      <th>Qty to Return</th>
                      <th>Refund Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loadedReceipt ? (
                      <tr>
                        <td colSpan="6" className="returns-empty-cell">
                          Load a receipt to review eligible return items.
                        </td>
                      </tr>
                    ) : returnItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="returns-empty-cell">
                          No returnable items were found for this receipt.
                        </td>
                      </tr>
                    ) : (
                      returnItems.map((item) => (
                        <tr key={item.productId}>
                          <td>
                            <button
                              type="button"
                              className={`returns-check ${item.selected ? "is-selected" : ""}`}
                              onClick={() => handleToggleItem(item.productId)}
                              aria-label={`Select ${item.name} for return`}
                              disabled={item.quantityEligible <= 0}
                            >
                              {item.selected ? "\u2713" : ""}
                            </button>
                          </td>
                          <td>
                            <div className="returns-product-cell">
                              <strong>{item.name}</strong>
                              <span>{item.sku}</span>
                              <small className="returns-eligible-copy">
                                Returned: {item.quantityAlreadyReturned} | Eligible:{" "}
                                {item.quantityEligible}
                              </small>
                            </div>
                          </td>
                          <td>{formatCurrency(item.unitPrice)}</td>
                          <td>{item.quantityPurchased}</td>
                          <td>
                            <div className="returns-qty-control">
                              <button
                                type="button"
                                onClick={() => handleDecreaseQty(item.productId)}
                                disabled={item.qtyToReturn === 0}
                              >
                                -
                              </button>
                              <strong>{item.qtyToReturn}</strong>
                              <button
                                type="button"
                                onClick={() => handleIncreaseQty(item.productId)}
                                disabled={item.qtyToReturn >= item.quantityEligible}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="returns-refund-amount">
                            {formatCurrency(item.selected ? item.unitPrice * item.qtyToReturn : 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="returns-note">
                <Info size={16} />
                <span>
                  Prices shown are exclusive of tax. Tax will be calculated in the final
                  summary.
                </span>
              </div>
            </section>

            <aside className="returns-summary-panel">
              <section className="returns-summary-card">
                <div className="returns-summary-head">
                  <RotateCcw size={18} />
                  <h3>Refund Summary</h3>
                </div>

                <div className="returns-summary-lines">
                  <div>
                    <span>Refund Subtotal</span>
                    <strong>{formatCurrency(refundSubtotal)}</strong>
                  </div>
                  <div>
                    <span>Tax Adjustment ({(effectiveTaxRate * 100).toFixed(1)}%)</span>
                    <strong>{formatCurrency(taxAdjustment)}</strong>
                  </div>
                </div>

                <div className="returns-summary-total">
                  <span>Total Refund</span>
                  <strong>{formatCurrency(totalRefund)}</strong>
                </div>

                <div className="returns-methods">
                  <p className="returns-method-label">Refund Method</p>
                  {refundMethods.map((method) => {
                    const Icon = method.icon;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        className={`returns-method-button ${
                          refundMethod === method.id ? "is-active" : ""
                        }`}
                        onClick={() => setRefundMethod(method.id)}
                      >
                        <Icon size={18} />
                        <span>{method.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="returns-summary-actions">
                  <button
                    type="button"
                    className="returns-confirm-button"
                    onClick={handleSubmitReturn}
                    disabled={!loadedReceipt || selectedReturnItems.length === 0 || isSubmitting}
                  >
                    <span>{isSubmitting ? "Processing Refund..." : "Confirm & Refund"}</span>
                    <ArrowLeft size={18} className="returns-confirm-arrow" />
                  </button>

                  <button
                    type="button"
                    className="returns-cancel-button"
                    onClick={() => navigate("/pos")}
                  >
                    Cancel Process
                  </button>
                </div>
              </section>

              <section className="returns-policy-card">
                <h4>Return Policy Reminders:</h4>
                <ul>
                  <li>Perishables must be returned within 24h with proof of storage.</li>
                  <li>Open electronics incur 15% restocking fee.</li>
                  <li>Manager override is required for all cash refunds &gt; {formatCurrency(20)}.</li>
                </ul>
              </section>
            </aside>
          </div>
        </section>

        <footer className="terminal-footer">
          <div className="terminal-footer-status">
            <span className="terminal-status-dot" aria-hidden="true" />
            <span>System Connected</span>
          </div>
          <div className="terminal-footer-session">
            Current Session: <strong>{formatCurrency(totalRefund)} Pending</strong>
          </div>
          <div className="terminal-footer-copy">
            <span>&copy; 2024 Supermarket POS</span>
            <button type="button">Keyboard Shortcuts</button>
          </div>
        </footer>
      </section>
    </main>
  );
}

export default Returns;

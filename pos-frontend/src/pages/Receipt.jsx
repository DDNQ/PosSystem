import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Download,
  LogOut,
  Mail,
  Monitor,
  PlusCircle,
  Printer,
  ScanLine,
  Share2,
  ShoppingCart,
} from "lucide-react";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import "../styles/pos.css";
import "../styles/receipt.css";
import { formatCurrency } from "../utils/currency";
import { getReceipt } from "../services/api";
import { readStoredReceiptSaleId, storeReceiptSaleId } from "../utils/receipt";

const STORE_INFO = {
  name: import.meta.env.VITE_STORE_NAME || "Freshmart Supermarket",
  addressLine1: import.meta.env.VITE_STORE_ADDRESS_LINE_1 || "123 Retail Avenue, Suite 400",
  addressLine2: import.meta.env.VITE_STORE_ADDRESS_LINE_2 || "Metropolis, ST 54321",
  phone: import.meta.env.VITE_STORE_PHONE || "(555) 012-3456",
  terminalName: import.meta.env.VITE_STORE_TERMINAL_NAME || "POS-001",
};

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Receipt() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const receiptState = location.state || {};
  const [cashierName, setCashierName] = useState("Sarah Jenkins");
  const [receipt, setReceipt] = useState(null);
  const [receiptError, setReceiptError] = useState("");
  const [isReceiptLoading, setIsReceiptLoading] = useState(true);
  const routeSaleId = Number.parseInt(params.saleId || "", 10);
  const stateSaleId = Number.parseInt(receiptState.saleId || "", 10);
  const storedSaleId = readStoredReceiptSaleId();
  const saleId = [routeSaleId, stateSaleId, storedSaleId].find(
    (value) => Number.isInteger(value) && value > 0
  );

  useEffect(() => {
    const storedUser = window.localStorage.getItem("posUser");

    if (!storedUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser?.name) {
        setCashierName(parsedUser.name);
      }
    } catch {
      setCashierName("Sarah Jenkins");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!saleId) {
      setReceiptError("No sale was provided for this receipt.");
      setIsReceiptLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadReceipt = async () => {
      setIsReceiptLoading(true);
      setReceiptError("");

      try {
        const data = await getReceipt(saleId);

        if (!isMounted) {
          return;
        }

        setReceipt(data);
        storeReceiptSaleId(data.saleId);

        if (data?.cashier?.name) {
          setCashierName(data.cashier.name);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setReceiptError(error.message || "Unable to load receipt.");
      } finally {
        if (isMounted) {
          setIsReceiptLoading(false);
        }
      }
    };

    loadReceipt();

    return () => {
      isMounted = false;
    };
  }, [saleId]);

  const items = useMemo(() => receipt?.items ?? [], [receipt?.items]);
  const payments = useMemo(() => receipt?.payments ?? [], [receipt?.payments]);

  const subtotal = typeof receipt?.subtotal === "number" ? receipt.subtotal : 0;
  const tax = typeof receipt?.tax === "number" ? receipt.tax : 0;
  const discount = typeof receipt?.discount === "number" ? receipt.discount : 0;
  const total = typeof receipt?.total === "number" ? receipt.total : 0;
  const totalPaid = typeof receipt?.amountPaid === "number" ? receipt.amountPaid : 0;
  const changeGiven = typeof receipt?.changeGiven === "number" ? receipt.changeGiven : 0;
  const customerEmail = receiptState.customer?.email || "Not provided";
  const customerName = receiptState.customer?.name || "Walk-in Customer";
  const cashierInitials = getInitials(cashierName) || "SJ";

  const summaryRows = [
    { label: "Subtotal", value: formatCurrency(subtotal) },
    { label: "Tax", value: formatCurrency(tax) },
    { label: "Discount", value: formatCurrency(discount) },
    { label: "Total", value: formatCurrency(total) },
  ];

  const handleLogout = () => {
    window.localStorage.removeItem("posUser");
    navigate("/");
  };

  return (
    <main className="terminal-shell receipt-terminal-shell">
      <section className="terminal-frame receipt-terminal-frame">
        <header className="terminal-header">
          <div className="terminal-brand">
            <div className="terminal-brand-mark">
              <ShoppingCart size={21} />
            </div>
            <h1>Supermarket POS</h1>
            <div className="terminal-chip">
              <Monitor size={15} />
              <span>Terminal: {STORE_INFO.terminalName}</span>
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
              <div className="terminal-user-avatar">{cashierInitials}</div>
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

        <section className="receipt-screen">
          <div className="receipt-shell">
            <header className="receipt-shell-header">
              <div className="receipt-shell-title">
                <span className="receipt-shell-icon">
                  <CheckCircle2 size={22} />
                </span>
                <div>
                  <h2>Transaction Successful</h2>
                  <div className="receipt-shell-meta">
                    <span>
                      {isReceiptLoading
                        ? "Loading receipt..."
                        : receipt?.receiptNumber || "Receipt unavailable"}
                    </span>
                    <Badge tone="neutral" className="receipt-paid-badge">
                      {receiptError ? "Error" : "Paid in Full"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="receipt-shell-actions">
                <Button variant="secondary" size="sm" leading={<Download size={16} />}>
                  Save PDF
                </Button>
                <Button variant="secondary" size="sm" leading={<Share2 size={16} />}>
                  Share
                </Button>
              </div>
            </header>

            <div className="receipt-body">
              <section className="receipt-preview-pane">
                <div className="receipt-paper">
                  <div className="receipt-paper-accent" />

                  <header className="receipt-paper-head">
                    <h3>{STORE_INFO.name.toUpperCase()}</h3>
                    <p>{STORE_INFO.addressLine1}</p>
                    <p>{STORE_INFO.addressLine2}</p>
                    <p>Tel: {STORE_INFO.phone}</p>
                  </header>

                  <div className="receipt-paper-meta">
                    <div>
                      <span>
                        <Clock3 size={13} />
                        {isReceiptLoading
                          ? "Loading..."
                          : receipt?.date
                            ? new Date(receipt.date).toLocaleDateString() +
                              " " +
                              new Date(receipt.date).toLocaleTimeString()
                            : "Unavailable"}
                      </span>
                      <span>
                        <ScanLine size={13} />
                        Cashier: {receipt?.cashier?.name || cashierName}
                      </span>
                    </div>
                    <div className="receipt-paper-meta-right">
                      <span>Customer: {customerName}</span>
                      <span>Sale ID: #{saleId ?? "--"}</span>
                    </div>
                  </div>

                  <div className="receipt-paper-table">
                    <div className="receipt-paper-table-head">
                      <span>Item Description</span>
                      <span>Total</span>
                    </div>

                    <div className="receipt-paper-items">
                      {isReceiptLoading ? (
                        <div className="receipt-paper-row">
                          <div>
                            <strong>Loading receipt items...</strong>
                            <span>Please wait</span>
                          </div>
                          <b>...</b>
                        </div>
                      ) : receiptError ? (
                        <div className="receipt-paper-row">
                          <div>
                            <strong>Unable to load receipt</strong>
                            <span>{receiptError}</span>
                          </div>
                          <b>--</b>
                        </div>
                      ) : (
                        items.map((item) => (
                          <div key={`${item.id}-${item.quantity}`} className="receipt-paper-row">
                            <div>
                              <strong>{item.name || "Unnamed item"}</strong>
                              <span>
                                {item.quantity} x {formatCurrency(item.unitPrice)}
                              </span>
                            </div>
                            <b>{formatCurrency(item.total)}</b>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="receipt-paper-summary">
                    {summaryRows.map((row) => (
                      <div key={row.label} className="receipt-paper-summary-row">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                    <div className="receipt-paper-summary-row total">
                      <span>Total Paid</span>
                      <strong>{formatCurrency(totalPaid)}</strong>
                    </div>
                  </div>

                  <footer className="receipt-paper-foot">
                    {payments.length ? (
                      payments.map((payment) => (
                        <p key={payment.id}>
                          {payment.method.replaceAll("_", " ")}: {formatCurrency(payment.amountPaid)}
                          {payment.reference ? ` | Ref ${payment.reference}` : ""}
                        </p>
                      ))
                    ) : (
                      <p>No payment details available.</p>
                    )}
                    <p>
                      Change Given: {formatCurrency(changeGiven)} | Receipt generated and ready to
                      print or send digitally.
                    </p>
                  </footer>
                </div>
              </section>

              <aside className="receipt-side-pane">
                <section className="receipt-action-block">
                  <p className="receipt-pane-label">Physical Receipt</p>
                  <div className="receipt-printer-card">
                    <span className="receipt-printer-icon">
                      <Printer size={28} />
                    </span>
                    <strong>Send to Main Printer</strong>
                    <p>Epson TM-T88VI | Online</p>
                    <Button
                      fullWidth
                      leading={<Printer size={17} />}
                      onClick={() => window.print()}
                    >
                      Print Receipt
                    </Button>
                  </div>
                </section>

                <section className="receipt-action-block">
                  <p className="receipt-pane-label">Payment Details</p>
                  <div className="receipt-payment-card">
                    {isReceiptLoading ? (
                      <div className="receipt-payment-empty">
                        <strong>Loading payment details...</strong>
                        <p>Please wait while we fetch the final receipt.</p>
                      </div>
                    ) : receiptError ? (
                      <div className="receipt-payment-empty">
                        <strong>Unable to load receipt</strong>
                        <p>{receiptError}</p>
                      </div>
                    ) : !payments.length ? (
                      <div className="receipt-payment-empty">
                        <strong>No payment details available</strong>
                        <p>The receipt was loaded without any successful payment rows.</p>
                      </div>
                    ) : (
                      payments.map((payment) => (
                      <div key={payment.id} className="receipt-payment-row">
                          <div className="receipt-payment-copy">
                            <strong>{payment.method.replaceAll("_", " ")}</strong>
                            <span title={payment.reference || "No reference"}>
                              {payment.reference || "No reference"}
                            </span>
                          </div>
                          <strong className="receipt-payment-amount">
                            {formatCurrency(payment.amountPaid)}
                          </strong>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="receipt-action-block">
                  <p className="receipt-pane-label">Digital Receipt</p>
                  <label className="receipt-email-field">
                    <span>Customer Email Address</span>
                    <div className="receipt-email-shell">
                      <Mail size={16} />
                      <input type="email" defaultValue={customerEmail} />
                    </div>
                  </label>
                  <Button variant="ghost" fullWidth>
                    Send Digital Copy
                  </Button>
                </section>
              </aside>
            </div>

            <footer className="receipt-shell-footer">
              <button
                type="button"
                className="receipt-back-link"
                onClick={() => navigate("/pos")}
              >
                <ChevronLeft size={16} />
                <span>Back to Terminal</span>
              </button>

              <div className="receipt-footer-actions">
                <Button variant="secondary" onClick={() => navigate("/pos")}>
                  Void &amp; Re-open
                </Button>
                <Button leading={<PlusCircle size={17} />} onClick={() => navigate("/pos")}>
                  New Transaction
                </Button>
              </div>
            </footer>
          </div>
        </section>

        <footer className="terminal-footer">
          <div className="terminal-footer-status">
            <span className="terminal-status-dot" aria-hidden="true" />
            <span>System Connected</span>
          </div>
          <div className="terminal-footer-session">
            Current Session: <strong>{formatCurrency(totalPaid)}</strong>
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

export default Receipt;

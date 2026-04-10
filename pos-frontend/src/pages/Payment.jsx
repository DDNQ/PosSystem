import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CirclePlus,
  CreditCard,
  Info,
  Landmark,
  LogOut,
  Monitor,
  Search,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import "../styles/pos.css";
import "../styles/payment.css";
import { formatCurrency } from "../utils/currency";
import { createPayment, initializePaystackPayment } from "../services/api";
import { storeReceiptSaleId } from "../utils/receipt";

const paymentMethods = {
  card: {
    id: "card",
    label: "Card",
    icon: CreditCard,
    checkout: "PAYSTACK",
    summary: "You will be redirected to Paystack to complete your card payment.",
    actionStatus: "Preparing Paystack card checkout...",
  },
  cash: {
    id: "cash",
    label: "Cash",
    icon: Landmark,
    checkout: "DIRECT",
    backendMethod: "CASH",
    summary: "Cash payments are completed directly from this terminal.",
    actionStatus: "Completing cash payment...",
  },
  wallet: {
    id: "wallet",
    label: "Mobile Money",
    icon: Smartphone,
    checkout: "PAYSTACK",
    summary: "You will be redirected to Paystack to complete your mobile money payment.",
    actionStatus: "Preparing Paystack mobile money checkout...",
  },
};

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getMethodLabel(method) {
  if (method === "wallet") {
    return "mobile money";
  }

  return method || "card";
}

function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentContext = location.state || {};
  const [cashierName, setCashierName] = useState("Marcus Rivera");
  const [selectedMethod, setSelectedMethod] = useState(paymentContext.method || "card");
  const [statusMessage, setStatusMessage] = useState("Select payment method to proceed.");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
      setCashierName("Marcus Rivera");
    }
  }, []);

  useEffect(() => {
    if (paymentContext.method) {
      setSelectedMethod(paymentContext.method);
    }
  }, [paymentContext.method]);

  useEffect(() => {
    if (!paymentContext.saleId) {
      navigate("/pos", { replace: true });
    }
  }, [navigate, paymentContext.saleId]);

  const saleId = paymentContext.saleId;
  const subtotal = typeof paymentContext.subtotal === "number" ? paymentContext.subtotal : 0;
  const tax = typeof paymentContext.tax === "number" ? paymentContext.tax : 0;
  const total = typeof paymentContext.total === "number" ? paymentContext.total : subtotal + tax;
  const customer = paymentContext.customer || null;
  const customerName = customer?.name || "Walk-in Customer";
  const activeMethod = paymentMethods[selectedMethod] || paymentMethods.card;
  const cashierInitials = getInitials(cashierName) || "CA";

  const paymentSummaryText = useMemo(() => activeMethod.summary, [activeMethod.summary]);

  const handleLogout = () => {
    window.localStorage.removeItem("posUser");
    navigate("/");
  };

  const handleProcessPayment = async () => {
    if (!saleId || isProcessingPayment) {
      return;
    }

    setIsProcessingPayment(true);
    setStatusMessage(activeMethod.actionStatus);

    if (activeMethod.checkout === "PAYSTACK") {
      try {
        const initialization = await initializePaystackPayment({ saleId });

        if (!initialization?.authorizationUrl || !initialization?.reference) {
          throw new Error("Paystack checkout could not be started.");
        }

        window.location.assign(initialization.authorizationUrl);
        return;
      } catch (error) {
        setStatusMessage(error.message || "Unable to start Paystack checkout.");
        setIsProcessingPayment(false);
        return;
      }
    }

    try {
      await createPayment({
        saleId,
        method: activeMethod.backendMethod,
        amountPaid: total,
      });

      storeReceiptSaleId(saleId);
      navigate(`/receipt/${saleId}`, {
        replace: true,
        state: {
          saleId,
          customer,
          cashierName,
          method: activeMethod.id,
        },
      });
    } catch (error) {
      setStatusMessage(error.message || "Unable to complete payment.");
      setIsProcessingPayment(false);
    }
  };

  return (
    <main className="terminal-shell payment-shell">
      <section className="terminal-frame payment-frame">
        <header className="terminal-header">
          <div className="terminal-brand">
            <div className="terminal-brand-mark">
              <ShoppingCart size={21} />
            </div>
            <h1>Supermarket POS</h1>
            <div className="terminal-chip">
              <Monitor size={15} />
              <span>Terminal: TERM-04</span>
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

        <section className="payment-content">
          <div className="payment-panel">
            <div className="payment-header">
              <div className="payment-title-group">
                <button
                  type="button"
                  className="payment-back-button"
                  onClick={() => navigate("/pos")}
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2>Process Payment</h2>
                  <p>Sale #{saleId ?? "--"} | Terminal TERM-04</p>
                </div>
              </div>

              <div className="payment-customer-chip">
                <span>Customer: {customerName}</span>
              </div>
            </div>

            <div className="payment-main-grid">
              <div className="payment-left-column">
                <div className="payment-due-card">
                  <div className="payment-due-copy">
                    <span>Total Due</span>
                    <p>Subtotal: {formatCurrency(subtotal)}</p>
                  </div>
                  <div className="payment-due-values">
                    <strong>{formatCurrency(total)}</strong>
                    <span>Tax: {formatCurrency(tax)}</span>
                  </div>
                </div>

                <div className="payment-methods-block">
                  <p className="payment-section-label">Select Method</p>

                  <div className="payment-method-grid">
                    {Object.values(paymentMethods).map((method) => {
                      const Icon = method.icon;
                      const isActive = selectedMethod === method.id;

                      return (
                        <button
                          key={method.id}
                          type="button"
                          className={`payment-method-card ${isActive ? "is-active" : ""}`}
                          onClick={() => setSelectedMethod(method.id)}
                        >
                          <Icon size={28} />
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="payment-ready-card">
                  <strong>{isProcessingPayment ? "Processing transaction" : "Ready for transaction"}</strong>
                  <span>{statusMessage}</span>
                </div>
              </div>

              <div className="payment-right-column">
                <div className="payment-tip-block">
                  <div className="payment-tip-head">
                    <p className="payment-section-label">Payment Flow</p>
                    <span className="payment-tip-pill">{getMethodLabel(selectedMethod)}</span>
                  </div>

                  <div className="payment-tip-grid">
                    <div className="payment-tip-card is-active">
                      <span>Sale Total</span>
                      <strong>{formatCurrency(total)}</strong>
                    </div>
                    <div className="payment-tip-card">
                      <span>Sale ID</span>
                      <strong>#{saleId ?? "--"}</strong>
                    </div>
                    <div className="payment-tip-card">
                      <span>Checkout</span>
                      <strong>{activeMethod.checkout === "PAYSTACK" ? "Paystack" : "Terminal"}</strong>
                    </div>
                    <div className="payment-tip-card">
                      <CirclePlus size={18} />
                      <strong>{activeMethod.checkout === "PAYSTACK" ? "Redirect" : "Instant"}</strong>
                    </div>
                  </div>
                </div>

                <div className="payment-customer-card">
                  <div className="payment-customer-head">
                    <Search size={18} />
                    <span>Customer Info</span>
                  </div>

                  <div className="payment-customer-stats">
                    <div>
                      <span>Sale ID:</span>
                      <strong>#{saleId ?? "--"}</strong>
                    </div>
                    <div>
                      <span>Payment Route:</span>
                      <em>{activeMethod.checkout === "PAYSTACK" ? "Paystack" : "Direct Backend"}</em>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="payment-change-customer"
                    onClick={() =>
                      navigate("/pos", {
                        state: {
                          openCustomerModal: true,
                          customerName,
                          subtotal,
                          method: selectedMethod,
                        },
                      })
                    }
                  >
                    Change Customer
                  </button>
                </div>

                <div className="payment-note-card">
                  <Info size={18} />
                  <p>{paymentSummaryText}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="payment-footer-actions">
            <button
              type="button"
              className="payment-cancel-action"
              onClick={() => navigate("/pos")}
            >
              Cancel Transaction
            </button>
            <button
              type="button"
              className="payment-process-action"
              disabled={isProcessingPayment || !saleId}
              onClick={handleProcessPayment}
            >
              {isProcessingPayment ? "Processing..." : "Process Payment"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default Payment;

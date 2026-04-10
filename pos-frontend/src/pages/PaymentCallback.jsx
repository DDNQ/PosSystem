import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { verifyPaystackPayment } from "../services/api";
import { storeReceiptSaleId } from "../utils/receipt";
import "../styles/pos.css";
import "../styles/payment.css";

function PaymentCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying Paystack payment...");

  useEffect(() => {
    let isMounted = true;
    const searchParams = new URLSearchParams(location.search);
    const reference = searchParams.get("reference") || searchParams.get("trxref");

    if (!reference) {
      setStatus("error");
      setMessage("Payment reference was not found in the callback URL.");
      return () => {
        isMounted = false;
      };
    }

    const runVerification = async () => {
      try {
        const verification = await verifyPaystackPayment(reference);

        if (!isMounted) {
          return;
        }

        setStatus("success");
        setMessage("Payment verified successfully. Redirecting to receipt...");

        storeReceiptSaleId(verification.saleId);
        navigate(`/receipt/${verification.saleId}`, {
          replace: true,
          state: {
            saleId: verification.saleId,
            method: verification.payment?.method?.toLowerCase() || "card",
            paymentReference: verification.reference,
          },
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setMessage(error.message || "Payment verification failed.");
      }
    };

    runVerification();

    return () => {
      isMounted = false;
    };
  }, [location.search, navigate]);

  return (
    <main className="terminal-shell payment-shell">
      <section className="terminal-frame payment-frame">
        <section className="payment-content">
          <div className="payment-panel">
            <div className="payment-main-grid">
              <div className="payment-left-column">
                <div className="payment-ready-card">
                  <strong>
                    {status === "verifying" ? "Processing Paystack callback" : "Payment callback"}
                  </strong>
                  <span>{message}</span>
                </div>
              </div>

              <div className="payment-right-column">
                <div className="payment-note-card">
                  {status === "verifying" ? (
                    <LoaderCircle size={18} />
                  ) : status === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}
                  <p>{message}</p>
                </div>

                {status === "error" ? (
                  <div className="payment-footer-actions">
                    <button
                      type="button"
                      className="payment-cancel-action"
                      onClick={() => navigate("/pos")}
                    >
                      Back to POS
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default PaymentCallback;

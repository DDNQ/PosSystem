import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  FileText,
  History,
  PackageCheck,
  PackagePlus,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import "../styles/dashboard.css";
import "../styles/inventory.css";
import "../styles/purchase-orders.css";
import { formatCurrency } from "../utils/currency";

const suggestionItems = [
  {
    id: "po-item-1",
    name: "Fresh Whole Milk 1L",
    sku: "MLK-001",
    stock: 12,
    target: 50,
    tone: "critical",
    image:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "po-item-2",
    name: "Organic Bananas (Bunch)",
    sku: "FRU-042",
    stock: 5,
    target: 20,
    tone: "critical",
    image:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "po-item-3",
    name: "Whole Wheat Bread",
    sku: "BAK-112",
    stock: 8,
    target: 15,
    tone: "warning",
    image:
      "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "po-item-4",
    name: "Pasta Penne 500g",
    sku: "PAN-098",
    stock: 22,
    target: 30,
    tone: "warning",
    image:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "po-item-5",
    name: "Sparkling Water 500ml",
    sku: "BEV-201",
    stock: 14,
    target: 40,
    tone: "critical",
    image:
      "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=200&q=80",
  },
];

const initialOrderLines = [
  {
    id: "line-1",
    name: "Fresh Whole Milk 1L",
    sku: "MLK-001",
    quantity: 40,
    unitCost: 1.15,
  },
  {
    id: "line-2",
    name: "Organic Bananas (Bunch)",
    sku: "FRU-042",
    quantity: 15,
    unitCost: 0.75,
  },
];

function PurchaseOrders() {
  const [filterTerm, setFilterTerm] = useState("");
  const [vendorName, setVendorName] = useState("Fresh Organics Co.");
  const [expectedDelivery, setExpectedDelivery] = useState("2024-11-20");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderLines, setOrderLines] = useState(initialOrderLines);

  const filteredSuggestions = useMemo(() => {
    return suggestionItems.filter((item) =>
      `${item.name} ${item.sku}`
        .toLowerCase()
        .includes(filterTerm.trim().toLowerCase())
    );
  }, [filterTerm]);

  const subtotal = orderLines.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const handleQuantityChange = (lineId, value) => {
    const nextQuantity = Number(value);

    setOrderLines((currentLines) =>
      currentLines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              quantity: Number.isNaN(nextQuantity) ? line.quantity : Math.max(0, nextQuantity),
            }
          : line
      )
    );
  };

  const handleRemoveLine = (lineId) => {
    setOrderLines((currentLines) => currentLines.filter((line) => line.id !== lineId));
  };

  const handleAddCriticalNeeds = () => {
    setOrderLines((currentLines) => {
      const existingIds = new Set(currentLines.map((line) => line.sku));
      const additions = suggestionItems
        .filter((item) => item.tone === "critical" && !existingIds.has(item.sku))
        .map((item) => ({
          id: `line-${item.id}`,
          name: item.name,
          sku: item.sku,
          quantity: Math.max(item.target - item.stock, 1),
          unitCost: item.sku === "BEV-201" ? 0.95 : 0.85,
        }));

      return [...currentLines, ...additions];
    });
  };

  return (
    <section className="po-shell">
      <aside className="po-left-rail">
        <div className="po-rail-header">
          <div>
            <h2>Replenishment</h2>
            <p>AI-Powered Suggestions</p>
          </div>
          <span className="po-urgent-badge">5 Urgent</span>
        </div>

        <label className="po-filter-shell">
          <Search size={18} />
          <input
            type="text"
            value={filterTerm}
            onChange={(event) => setFilterTerm(event.target.value)}
            placeholder="Filter alerts..."
            aria-label="Filter replenishment alerts"
          />
        </label>

        <button
          type="button"
          className="po-add-critical-button"
          onClick={handleAddCriticalNeeds}
        >
          <span>Add All Critical Needs</span>
          <PackagePlus size={16} />
        </button>

        <div className="po-suggestion-list">
          {filteredSuggestions.map((item) => {
            const progress = Math.min((item.stock / item.target) * 100, 100);

            return (
              <article key={item.id} className="po-suggestion-card">
                <div className="po-product-thumb">
                  <img src={item.image} alt={item.name} />
                </div>

                <div className="po-suggestion-copy">
                  <div className="po-suggestion-top">
                    <div>
                      <strong>{item.name}</strong>
                      <span>SKU: {item.sku}</span>
                    </div>
                    <em className={`po-suggestion-badge ${item.tone}`}>{item.tone}</em>
                  </div>

                  <div className="po-stock-block">
                    <span>Stock Level</span>
                    <strong>
                      {item.stock} / {item.target}
                    </strong>
                  </div>
                  <div className={`po-stock-bar ${item.tone}`}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="po-rail-footnote">
          End of priority list. All other stock levels are healthy.
        </p>
      </aside>

      <section className="po-main">
        <div className="po-main-header">
          <div>
            <p className="po-eyebrow">Inventory &gt; Procurement</p>
            <h1>Create Purchase Order</h1>
            <span>Draft PO ID: #ORD-2024-05129</span>
          </div>

          <div className="po-main-actions">
            <button type="button" className="manager-ghost-button">
              <Trash2 size={16} />
              <span>Discard Draft</span>
            </button>
            <button type="button" className="manager-ghost-button">
              <History size={16} />
              <span>View History</span>
            </button>
          </div>
        </div>

        <section className="po-editor-card">
          <div className="po-editor-top">
            <div className="po-field">
              <label>Vendor / Supplier</label>
              <div className="po-input-shell">
                <input
                  type="text"
                  value={vendorName}
                  onChange={(event) => setVendorName(event.target.value)}
                />
                <ChevronRight size={18} className="po-chevron" />
              </div>
            </div>

            <div className="po-field">
              <label>Expected Delivery</label>
              <div className="po-input-shell">
                <CalendarDays size={16} />
                <input
                  type="text"
                  value={expectedDelivery}
                  onChange={(event) => setExpectedDelivery(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="po-contact-strip">
            <div>
              <span>Contact Person</span>
              <strong>Sarah Jenkins</strong>
              <p>sarah.j@freshorganics.com</p>
            </div>
            <div>
              <span>Lead Time</span>
              <strong>
                <Truck size={15} />
                2-3 Business Days
              </strong>
            </div>
            <div>
              <span>Min. Order Value</span>
              <strong>{formatCurrency(250)} (Met)</strong>
            </div>
          </div>

          <div className="po-lines-section">
            <div className="po-lines-head">
              <span>Product Details</span>
              <span>Quantity</span>
              <span>Unit Cost</span>
              <span>Total</span>
              <span />
            </div>

            <div className="po-line-list">
              {orderLines.map((line) => (
                <div key={line.id} className="po-line-item">
                  <div className="po-line-product">
                    <strong>{line.name}</strong>
                    <span>SKU: {line.sku}</span>
                  </div>
                  <div className="po-line-qty">
                    <input
                      type="number"
                      min="0"
                      value={line.quantity}
                      onChange={(event) =>
                        handleQuantityChange(line.id, event.target.value)
                      }
                    />
                  </div>
                  <div className="po-line-cost">{formatCurrency(line.unitCost)}</div>
                  <div className="po-line-total">
                    {formatCurrency(line.quantity * line.unitCost)}
                  </div>
                  <button
                    type="button"
                    className="po-line-remove"
                    onClick={() => handleRemoveLine(line.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="po-editor-bottom">
            <div className="po-notes-block">
              <label>Order Notes (Optional)</label>
              <textarea
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                placeholder="Special instructions for delivery, handling requirements, or warehouse notes..."
              />
              <div className="po-note-tip">
                <FileText size={14} />
                <span>
                  Prices are indicative based on last purchase. Final invoice may vary
                  by +2%.
                </span>
              </div>
            </div>

            <div className="po-summary-block">
              <div className="po-summary-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div className="po-summary-row">
                <span>Est. Tax (5%)</span>
                <strong>{formatCurrency(tax)}</strong>
              </div>
              <div className="po-summary-row">
                <span>Delivery Fee</span>
                <strong>Free</strong>
              </div>
              <div className="po-summary-total">
                <span>Grand Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>

              <button type="button" className="po-confirm-button">
                <span>Confirm &amp; Send PO</span>
                <PackageCheck size={18} />
              </button>
            </div>
          </div>
        </section>

        <div className="po-progress-strip">
          <div className="po-progress-step is-active">
            <span>1</span>
            <strong>Draft</strong>
          </div>
          <div className="po-progress-line" />
          <div className="po-progress-step">
            <span>2</span>
            <strong>Sent to Supplier</strong>
          </div>
          <div className="po-progress-line" />
          <div className="po-progress-step">
            <span>3</span>
            <strong>Received</strong>
          </div>
        </div>

        <footer className="po-footer">
          <div className="po-footer-status">
            <span className="terminal-status-dot" aria-hidden="true" />
            <span>System Connected</span>
            <span className="inventory-footer-divider" />
            <span>Version 2.4.0-build.88</span>
          </div>
          <div className="po-footer-copy">
            <span>&copy; 2024 Supermarket POS</span>
            <button type="button">Keyboard Shortcuts</button>
          </div>
        </footer>
      </section>
    </section>
  );
}

export default PurchaseOrders;

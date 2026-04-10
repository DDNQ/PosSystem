import {
  ArrowLeft,
  CircleAlert,
  DollarSign,
  ImagePlus,
  Info,
  Plus,
  RefreshCw,
  Save,
  Upload,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Badge from "../components/common/Badge";
import "../styles/dashboard.css";
import "../styles/edit-product.css";

const galleryImages = [
  {
    id: "primary",
    label: "Primary",
    src: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "alt-1",
    label: "Alternate pack",
    src: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "alt-2",
    label: "Bottle",
    src: "https://images.unsplash.com/photo-1582719478185-2190afef4d1a?auto=format&fit=crop&w=400&q=80",
  },
];

function EditProduct() {
  const navigate = useNavigate();

  return (
    <section className="product-editor-screen">
      <div className="product-editor-topbar">
        <div className="product-editor-title-group">
          <button
            type="button"
            className="product-editor-back"
            onClick={() => navigate("/inventory")}
          >
            <ArrowLeft size={17} />
            <span>Back to Inventory</span>
          </button>

          <div className="product-editor-heading">
            <div className="product-editor-heading-row">
              <h2>Edit Product</h2>
              <Badge tone="neutral">In Stock</Badge>
            </div>
            <p>Review product metadata, pricing, and stock context before saving.</p>
          </div>
        </div>

        <div className="product-editor-actions">
          <button type="button" className="product-editor-secondary">
            <X size={16} />
            <span>Discard Changes</span>
          </button>
          <button type="button" className="product-editor-primary">
            <Save size={16} />
            <span>Save Product</span>
          </button>
        </div>
      </div>

      <div className="product-editor-layout">
        <div className="product-editor-main">
          <section className="product-editor-card">
            <div className="product-editor-card-head">
              <div className="product-editor-section-title">
                <Info size={17} />
                <h3>General Information</h3>
              </div>
            </div>

            <div className="product-editor-card-body">
              <div className="product-editor-field full">
                <label>Product Name</label>
                <input type="text" defaultValue="Premium Organic Whole Milk 2L" />
              </div>

              <div className="product-editor-grid two">
                <div className="product-editor-field">
                  <label>SKU / Internal ID</label>
                  <input type="text" defaultValue="DAI-7729-MLK" />
                </div>
                <div className="product-editor-field">
                  <label>Category</label>
                  <input type="text" defaultValue="Dairy Products" />
                </div>
              </div>

              <div className="product-editor-field full">
                <label>Barcode (EAN-13 / UPC)</label>
                <div className="product-editor-inline-field">
                  <div className="product-editor-input-shell">
                    <span className="product-editor-leading">||||</span>
                    <input type="text" defaultValue="9312345678901" />
                  </div>
                  <button type="button" className="product-editor-icon-action" aria-label="Refresh barcode">
                    <RefreshCw size={17} />
                  </button>
                </div>
                <p>Leave blank to auto-generate a system-standard EAN code upon saving.</p>
              </div>
            </div>
          </section>

          <section className="product-editor-card">
            <div className="product-editor-card-head">
              <div className="product-editor-section-title">
                <DollarSign size={17} />
                <h3>Pricing &amp; Financials</h3>
              </div>
            </div>

            <div className="product-editor-card-body">
              <div className="product-editor-grid two">
                <div className="product-editor-field">
                  <label>Cost Price (Per Unit)</label>
                  <div className="product-editor-input-shell">
                    <span className="product-editor-leading">$</span>
                    <input type="text" defaultValue="2.45" />
                  </div>
                </div>

                <div className="product-editor-field">
                  <label>Retail Price (Inc. Tax)</label>
                  <div className="product-editor-input-shell is-highlighted">
                    <span className="product-editor-leading">$</span>
                    <input type="text" defaultValue="4.95" />
                  </div>
                </div>
              </div>

              <div className="product-editor-profit-card">
                <div>
                  <span>Profit Margin</span>
                  <strong>50.5%</strong>
                </div>
                <div className="product-editor-profit-divider" />
                <div className="align-right">
                  <span>Net Profit / Unit</span>
                  <strong>$2.50</strong>
                </div>
              </div>

              <div className="product-editor-field half">
                <label>Tax Classification</label>
                <div className="product-editor-input-shell">
                  <span className="product-editor-leading">%</span>
                  <input type="text" defaultValue="VAT Standard (10%)" />
                </div>
              </div>
            </div>
          </section>

          <section className="product-editor-card">
            <div className="product-editor-card-head">
              <div className="product-editor-section-title">
                <Plus size={17} />
                <h3>Logistics &amp; Supply Chain</h3>
              </div>
            </div>

            <div className="product-editor-card-body">
              <div className="product-editor-grid two">
                <div className="product-editor-field">
                  <label>Primary Supplier</label>
                  <input type="text" defaultValue="Fresh Valley Farms Co." />
                </div>
                <div className="product-editor-field">
                  <label>Reorder Threshold</label>
                  <input type="text" defaultValue="24" />
                  <p>System will trigger an alert when stock falls below this value.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="product-editor-side">
          <section className="product-editor-side-card">
            <div className="product-editor-side-head">
              <div className="product-editor-section-title">
                <ImagePlus size={17} />
                <h3>Product Images</h3>
              </div>
              <button type="button" className="product-editor-link">
                <Upload size={14} />
                <span>Upload</span>
              </button>
            </div>

            <div className="product-editor-image-stack">
              <div className="product-editor-image-main">
                <span className="product-editor-image-tag">Primary</span>
                <img src={galleryImages[0].src} alt={galleryImages[0].label} />
              </div>

              <div className="product-editor-thumbs">
                {galleryImages.slice(1).map((image) => (
                  <button key={image.id} type="button" className="product-editor-thumb">
                    <img src={image.src} alt={image.label} />
                  </button>
                ))}
                <button type="button" className="product-editor-thumb add" aria-label="Add product image">
                  <Plus size={28} />
                </button>
              </div>

              <p>Supported formats: JPG, PNG. Max 5MB per file.</p>
            </div>
          </section>

          <section className="product-editor-side-card">
            <div className="product-editor-section-title">
              <CircleAlert size={17} />
              <h3>Inventory Context</h3>
            </div>

            <div className="product-editor-stock-card">
              <div className="product-editor-stock-row">
                <div>
                  <span>Current Stock</span>
                  <strong>142</strong>
                </div>
                <div className="align-right">
                  <span>Optimal Level</span>
                  <strong>100 - 150 units</strong>
                </div>
              </div>

              <div className="product-editor-stock-bar">
                <span style={{ width: "71%" }} />
              </div>

              <div className="product-editor-stock-meta">
                <div>
                  <span>Last Received</span>
                  <strong>Oct 12, 2023</strong>
                </div>
                <div>
                  <span>Last Sale</span>
                  <strong>2 mins ago</strong>
                </div>
                <div>
                  <span>Sales Velocity</span>
                  <strong className="accent">High</strong>
                </div>
              </div>

              <button type="button" className="product-editor-secondary block">
                Manage Purchase Orders
              </button>
            </div>
          </section>

          <section className="product-editor-audit-card">
            <RefreshCw size={16} />
            <div>
              <strong>Last Edited by</strong>
              <span>Sarah Jenkins (Admin)</span>
              <p>Oct 24, 2023 · 09:42 AM</p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default EditProduct;

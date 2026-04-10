import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Box,
  CircleAlert,
  CircleX,
  Eye,
  Download,
  Pencil,
  Filter,
  PackagePlus,
  RotateCw,
  Search,
  TrendingUp,
  Trash2,
} from "lucide-react";
import "../styles/dashboard.css";
import "../styles/inventory.css";
import { ROLES } from "../utils/auth";
import { formatCurrency } from "../utils/currency";
import {
  adjustInventory,
  createProduct,
  getCategories,
  getProducts,
  updateProduct,
} from "../services/api";

const LOW_STOCK_THRESHOLD = 10;

const emptyProductForm = {
  name: "",
  description: "",
  sku: "",
  price: "",
  stock: "",
  barcode: "",
  imageUrl: "",
  categoryId: "",
};

const emptyStockAdjustmentForm = {
  quantityChanged: "",
  type: "IN",
  reason: "",
};

const emptyEditProductForm = {
  name: "",
  description: "",
  sku: "",
  price: "",
  barcode: "",
  imageUrl: "",
  categoryId: "",
  isActive: true,
};

function getStockStatus(stock) {
  const numericStock = Number(stock) || 0;

  if (numericStock <= 0) {
    return { label: "Out of Stock", tone: "danger", minimum: LOW_STOCK_THRESHOLD };
  }

  if (numericStock <= LOW_STOCK_THRESHOLD) {
    return { label: "Low Stock", tone: "warning", minimum: LOW_STOCK_THRESHOLD };
  }

  return { label: "Healthy", tone: "healthy", minimum: LOW_STOCK_THRESHOLD };
}

function getStockSeverity(stock) {
  const stockStatus = getStockStatus(stock);

  if (stockStatus.tone === "danger") {
    return 3;
  }

  if (stockStatus.tone === "warning") {
    return 2;
  }

  return 1;
}

function normalizeProductRow(product) {
  const stockStatus = getStockStatus(product.stock);

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category?.name ?? "Uncategorized",
    stock: Number(product.stock) || 0,
    minimum: stockStatus.minimum,
    price: formatCurrency(Number(product.price) || 0),
    status: stockStatus.label,
    statusTone: stockStatus.tone,
  };
}

function buildInventoryDedupKey(product) {
  const normalizedName = String(product.name ?? "")
    .trim()
    .toLowerCase();
  const normalizedCategory = String(product.category?.name ?? "Uncategorized")
    .trim()
    .toLowerCase();

  return `${normalizedName}::${normalizedCategory}`;
}

function dedupeProductsForInventory(products) {
  const uniqueProducts = new Map();

  products.forEach((product) => {
    const dedupeKey = buildInventoryDedupKey(product);
    const existingProduct = uniqueProducts.get(dedupeKey);

    if (!existingProduct) {
      uniqueProducts.set(dedupeKey, product);
      return;
    }

    const existingSeverity = getStockSeverity(existingProduct.stock);
    const nextSeverity = getStockSeverity(product.stock);

    if (nextSeverity > existingSeverity) {
      uniqueProducts.set(dedupeKey, product);
      return;
    }

    if (nextSeverity === existingSeverity && (Number(product.stock) || 0) < (Number(existingProduct.stock) || 0)) {
      uniqueProducts.set(dedupeKey, product);
    }
  });

  return Array.from(uniqueProducts.values());
}

function Inventory() {
  const { role = ROLES.MANAGER } = useOutletContext() ?? {};
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [formError, setFormError] = useState("");
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockAdjustmentForm, setStockAdjustmentForm] = useState(emptyStockAdjustmentForm);
  const [stockAdjustmentError, setStockAdjustmentError] = useState("");
  const [isSubmittingStockAdjustment, setIsSubmittingStockAdjustment] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedEditProductId, setSelectedEditProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState(emptyEditProductForm);
  const [editProductError, setEditProductError] = useState("");
  const [isSubmittingEditProduct, setIsSubmittingEditProduct] = useState(false);
  const isAdmin = role === ROLES.ADMIN;

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setIsProductsLoading(true);
      setProductsError("");

      try {
        const backendProducts = await getProducts();

        if (!isMounted) {
          return;
        }

        setProducts(backendProducts);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setProductsError(error.message || "Unable to load products.");
      } finally {
        if (isMounted) {
          setIsProductsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setIsCategoriesLoading(true);
      setCategoriesError("");

      try {
        const backendCategories = await getCategories();

        if (!isMounted) {
          return;
        }

        setCategories(backendCategories);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCategoriesError(error.message || "Unable to load categories.");
      } finally {
        if (isMounted) {
          setIsCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const inventoryRows = useMemo(
    () => dedupeProductsForInventory(products).map(normalizeProductRow),
    [products]
  );

  const filteredRows = useMemo(
    () =>
      inventoryRows.filter((row) =>
        `${row.sku} ${row.name} ${row.category}`
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase())
      ),
    [inventoryRows, searchTerm]
  );

  const statCards = useMemo(() => {
    const lowStockCount = inventoryRows.filter((row) => row.status === "Low Stock").length;
    const outOfStockCount = inventoryRows.filter((row) => row.status === "Out of Stock").length;

    return [
      { label: "Total SKUs", value: inventoryRows.length.toLocaleString(), icon: Box, tone: "blue" },
      {
        label: "Low Stock Items",
        value: lowStockCount.toLocaleString(),
        icon: CircleAlert,
        tone: "neutral",
      },
      {
        label: "Out of Stock",
        value: outOfStockCount.toLocaleString(),
        icon: TrendingUp,
        tone: "red",
      },
      { label: "Pending POs", value: "0", icon: RotateCw, tone: "green" },
    ];
  }, [inventoryRows]);

  const criticalItemsCount = useMemo(
    () => inventoryRows.filter((row) => row.status !== "Healthy").length,
    [inventoryRows]
  );

  const closeAddProductModal = () => {
    setIsAddProductOpen(false);
    setProductForm(emptyProductForm);
    setFormError("");
  };

  const openEditProductModal = (productId) => {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      setProductsError("Unable to load the selected product.");
      return;
    }

    setSelectedEditProductId(product.id);
    setEditProductForm({
      name: product.name ?? "",
      description: product.description ?? "",
      sku: product.sku ?? "",
      price: String(product.price ?? ""),
      barcode: product.barcode ?? "",
      imageUrl: product.imageUrl ?? "",
      categoryId: String(product.categoryId ?? ""),
      isActive: Boolean(product.isActive),
    });
    setEditProductError("");
    setSuccessMessage("");
    setIsEditProductOpen(true);
  };

  const closeEditProductModal = () => {
    setIsEditProductOpen(false);
    setSelectedEditProductId(null);
    setEditProductForm(emptyEditProductForm);
    setEditProductError("");
  };

  const openStockAdjustmentModal = (product) => {
    setSelectedProduct(product);
    setStockAdjustmentForm(emptyStockAdjustmentForm);
    setStockAdjustmentError("");
    setSuccessMessage("");
    setIsStockAdjustmentOpen(true);
  };

  const closeStockAdjustmentModal = () => {
    setIsStockAdjustmentOpen(false);
    setSelectedProduct(null);
    setStockAdjustmentForm(emptyStockAdjustmentForm);
    setStockAdjustmentError("");
  };

  const handleProductFieldChange = (field, value) => {
    setProductForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleStockAdjustmentFieldChange = (field, value) => {
    setStockAdjustmentForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEditProductFieldChange = (field, value) => {
    setEditProductForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const refreshProducts = async () => {
    const backendProducts = await getProducts();
    setProducts(backendProducts);
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim() || undefined,
      sku: productForm.sku.trim(),
      price: productForm.price.trim(),
      stock: productForm.stock.trim(),
      barcode: productForm.barcode.trim() || undefined,
      imageUrl: productForm.imageUrl.trim() || undefined,
      categoryId: productForm.categoryId,
    };

    if (!payload.name || !payload.sku || !payload.price || !payload.stock || !payload.categoryId) {
      setFormError("Name, SKU, price, stock, and category are required.");
      return;
    }

    setIsSubmittingProduct(true);
    setFormError("");

    try {
      await createProduct(payload);
      await refreshProducts();
      closeAddProductModal();
      setSuccessMessage("Product created successfully.");
    } catch (error) {
      setFormError(error.message || "Unable to create product.");
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleSubmitStockAdjustment = async (event) => {
    event.preventDefault();

    if (!selectedProduct?.id) {
      setStockAdjustmentError("Select a valid product before updating stock.");
      return;
    }

    const normalizedQuantityChanged = stockAdjustmentForm.quantityChanged.trim();
    const normalizedType = stockAdjustmentForm.type;
    const normalizedReason = stockAdjustmentForm.reason.trim();

    if (!normalizedQuantityChanged || !normalizedType) {
      setStockAdjustmentError("Quantity changed and type are required.");
      return;
    }

    const quantityValue = Number.parseInt(normalizedQuantityChanged, 10);

    if (Number.isNaN(quantityValue) || quantityValue === 0) {
      setStockAdjustmentError("Quantity changed must be a non-zero integer.");
      return;
    }

    if (normalizedType === "IN" && quantityValue < 0) {
      setStockAdjustmentError("IN movements must use a positive quantity.");
      return;
    }

    if (normalizedType === "OUT" && quantityValue > 0) {
      setStockAdjustmentError("OUT movements must use a negative quantity.");
      return;
    }

    setIsSubmittingStockAdjustment(true);
    setStockAdjustmentError("");

    try {
      await adjustInventory(selectedProduct.id, {
        quantityChanged: quantityValue,
        type: normalizedType,
        reason: normalizedReason || undefined,
      });
      await refreshProducts();
      closeStockAdjustmentModal();
      setSuccessMessage(`Stock updated successfully for ${selectedProduct.name}.`);
    } catch (error) {
      setStockAdjustmentError(error.message || "Unable to update stock.");
    } finally {
      setIsSubmittingStockAdjustment(false);
    }
  };

  const handleSubmitEditProduct = async (event) => {
    event.preventDefault();

    if (!selectedEditProductId) {
      setEditProductError("Select a valid product before saving changes.");
      return;
    }

    const payload = {
      name: editProductForm.name.trim(),
      description: editProductForm.description.trim() || null,
      sku: editProductForm.sku.trim(),
      price: editProductForm.price.trim(),
      barcode: editProductForm.barcode.trim() || null,
      imageUrl: editProductForm.imageUrl.trim() || null,
      categoryId: editProductForm.categoryId,
      isActive: editProductForm.isActive,
    };

    if (!payload.name || !payload.sku || !payload.price || !payload.categoryId) {
      setEditProductError("Name, SKU, price, and category are required.");
      return;
    }

    setIsSubmittingEditProduct(true);
    setEditProductError("");

    try {
      await updateProduct(selectedEditProductId, payload);
      await refreshProducts();
      closeEditProductModal();
      setSuccessMessage("Product updated successfully.");
    } catch (error) {
      setEditProductError(error.message || "Unable to update product.");
    } finally {
      setIsSubmittingEditProduct(false);
    }
  };

  return (
    <section className="manager-content inventory-content">
      <div className="manager-hero">
        <div>
          <h2>{isAdmin ? "Product & Stock Management" : "Products & Stock Overview"}</h2>
          <p>
            {isAdmin
              ? "Add, edit, and delete products while managing stock levels across the catalog."
              : "View products, monitor stock levels, and make operational stock updates."}
          </p>
        </div>

        <div className="manager-hero-actions">
          <button type="button" className="manager-ghost-button">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button type="button" className="manager-primary-button">
            <RotateCw size={16} />
            <span>Update Stock</span>
          </button>
          <button
            type="button"
            className="manager-primary-button"
            onClick={() => {
              setSuccessMessage("");
              setIsAddProductOpen(true);
            }}
          >
            <PackagePlus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {successMessage ? <div className="inventory-feedback success">{successMessage}</div> : null}
      {productsError ? <div className="inventory-feedback error">{productsError}</div> : null}

      <div className="inventory-stat-grid">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.label} className="inventory-stat-card">
              <div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </div>
              <span className={`inventory-stat-icon tone-${card.tone}`}>
                <Icon size={22} />
              </span>
            </article>
          );
        })}
      </div>

      <section className="inventory-reorder-banner">
        <div className="inventory-reorder-copy">
          <CircleAlert size={20} />
          <div>
            <strong>Smart Reorder Suggestions</strong>
            <span>
              {criticalItemsCount} items have reached critical levels and may need attention.
            </span>
          </div>
        </div>
        <button type="button" className="manager-secondary-button">
          Create Bulk PO
        </button>
      </section>

      <section className="inventory-table-card">
        <div className="inventory-table-head">
          <div>
            <h3>{isAdmin ? "Master Product List" : "Product List"}</h3>
            <p>
              {isAdmin
                ? "Comprehensive list of all store products and current availability."
                : "Read-only product visibility with quick stock adjustment access."}
            </p>
          </div>

          <div className="inventory-table-tools">
            <label className="inventory-search-shell">
              <Search size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search SKU or Name..."
                aria-label="Search inventory"
              />
            </label>
            <button type="button" className="inventory-filter-button" aria-label="Filter">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Stock Level</th>
                <th>Unit Price</th>
                <th>Status</th>
                <th>{isAdmin ? "Actions" : "View / Update"}</th>
              </tr>
            </thead>
            <tbody>
              {isProductsLoading ? (
                <tr>
                  <td colSpan="7">Loading products from the backend...</td>
                </tr>
              ) : !filteredRows.length ? (
                <tr>
                  <td colSpan="7">
                    {searchTerm.trim() ? "No matching products found." : "No products available yet."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const progress = row.minimum
                    ? Math.min((row.stock / row.minimum) * 100, 100)
                    : 0;

                  return (
                    <tr key={row.id}>
                      <td className="inventory-sku">{row.sku}</td>
                      <td className="inventory-product-name">{row.name}</td>
                      <td>
                        <span className="inventory-category-pill">{row.category}</span>
                      </td>
                      <td>
                        <div className="inventory-stock-cell">
                          <div className="inventory-stock-meta">
                            <span>{row.stock} Units</span>
                            <strong>Min: {row.minimum}</strong>
                          </div>
                          <div className="inventory-stock-bar">
                            <span style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="inventory-price">{row.price}</td>
                      <td>
                        <span className={`inventory-status-pill tone-${row.statusTone}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <div className="inventory-row-actions">
                          {isAdmin ? (
                            <>
                              <button
                                type="button"
                                className="inventory-row-action"
                                onClick={() => openEditProductModal(row.id)}
                                aria-label={`Edit ${row.name}`}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="inventory-row-action"
                                aria-label={`Delete ${row.name}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="inventory-row-action"
                                aria-label={`View ${row.name}`}
                                onClick={() => openEditProductModal(row.id)}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                className="inventory-row-action"
                                aria-label={`Update stock for ${row.name}`}
                                onClick={() => openStockAdjustmentModal(row)}
                              >
                                <RotateCw size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="inventory-table-footer">
          <span>
            Showing {filteredRows.length ? 1 : 0}-{filteredRows.length} of {inventoryRows.length} products
          </span>
          <div className="inventory-pagination">
            <button type="button" disabled>
              Previous
            </button>
            <button type="button" className="is-active">
              1
            </button>
            <button type="button" disabled>
              2
            </button>
            <button type="button" disabled>
              3
            </button>
            <button type="button" disabled>
              Next
            </button>
          </div>
        </div>
      </section>

      <footer className="inventory-footer">
        <div className="inventory-footer-status">
          <span className="terminal-status-dot" aria-hidden="true" />
          <span>System Connected</span>
          <span className="inventory-footer-divider" />
          <span>Version 2.4.0-build.88</span>
        </div>
        <div className="inventory-footer-copy">
          <span>&copy; 2024 Supermarket POS</span>
          <button type="button">Keyboard Shortcuts</button>
        </div>
      </footer>

      {isAddProductOpen ? (
        <div className="inventory-modal-overlay">
          <div className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="add-product-title">
            <div className="inventory-modal-head">
              <div>
                <h3 id="add-product-title">Add New Product</h3>
                <p>Create a product directly in the live backend catalog.</p>
              </div>
              <button
                type="button"
                className="inventory-modal-close"
                onClick={closeAddProductModal}
                aria-label="Close add product form"
              >
                <CircleX size={18} />
              </button>
            </div>

            <form className="inventory-modal-form" onSubmit={handleCreateProduct}>
              <div className="inventory-form-grid">
                <label className="inventory-form-field">
                  <span>Product Name</span>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(event) => handleProductFieldChange("name", event.target.value)}
                    disabled={isSubmittingProduct}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>SKU</span>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(event) => handleProductFieldChange("sku", event.target.value)}
                    disabled={isSubmittingProduct}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>Price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(event) => handleProductFieldChange("price", event.target.value)}
                    disabled={isSubmittingProduct}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>Stock</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={productForm.stock}
                    onChange={(event) => handleProductFieldChange("stock", event.target.value)}
                    disabled={isSubmittingProduct}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>Barcode</span>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={(event) => handleProductFieldChange("barcode", event.target.value)}
                    disabled={isSubmittingProduct}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>Image URL</span>
                  <input
                    type="url"
                    value={productForm.imageUrl}
                    onChange={(event) => handleProductFieldChange("imageUrl", event.target.value)}
                    disabled={isSubmittingProduct}
                  />
                </label>

                <label className="inventory-form-field inventory-form-field-wide">
                  <span>Category</span>
                  <select
                    value={productForm.categoryId}
                    onChange={(event) => handleProductFieldChange("categoryId", event.target.value)}
                    disabled={isSubmittingProduct || isCategoriesLoading}
                  >
                    <option value="">
                      {isCategoriesLoading ? "Loading categories..." : "Select category"}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categoriesError ? <small>{categoriesError}</small> : null}
                </label>

                <label className="inventory-form-field inventory-form-field-wide">
                  <span>Description</span>
                  <textarea
                    rows="4"
                    value={productForm.description}
                    onChange={(event) => handleProductFieldChange("description", event.target.value)}
                    disabled={isSubmittingProduct}
                  />
                </label>
              </div>

              {formError ? <div className="inventory-form-error">{formError}</div> : null}

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="manager-ghost-button"
                  onClick={closeAddProductModal}
                  disabled={isSubmittingProduct}
                >
                  Cancel
                </button>
                <button type="submit" className="manager-primary-button" disabled={isSubmittingProduct}>
                  <PackagePlus size={16} />
                  <span>{isSubmittingProduct ? "Saving..." : "Create Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isStockAdjustmentOpen ? (
        <div className="inventory-modal-overlay">
          <div
            className="inventory-modal inventory-modal-compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-adjustment-title"
          >
            <div className="inventory-modal-head">
              <div>
                <h3 id="stock-adjustment-title">Update Stock</h3>
                <p>Apply a live inventory adjustment for the selected product.</p>
              </div>
              <button
                type="button"
                className="inventory-modal-close"
                onClick={closeStockAdjustmentModal}
                aria-label="Close stock update form"
              >
                <CircleX size={18} />
              </button>
            </div>

            <form className="inventory-modal-form" onSubmit={handleSubmitStockAdjustment}>
              <div className="inventory-adjustment-summary">
                <div>
                  <span>Product</span>
                  <strong>{selectedProduct?.name ?? "--"}</strong>
                </div>
                <div>
                  <span>Current Stock</span>
                  <strong>{selectedProduct?.stock ?? 0} Units</strong>
                </div>
              </div>

              <div className="inventory-form-grid">
                <label className="inventory-form-field">
                  <span>Quantity Changed</span>
                  <input
                    type="number"
                    step="1"
                    value={stockAdjustmentForm.quantityChanged}
                    onChange={(event) =>
                      handleStockAdjustmentFieldChange("quantityChanged", event.target.value)
                    }
                    disabled={isSubmittingStockAdjustment}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>Type</span>
                  <select
                    value={stockAdjustmentForm.type}
                    onChange={(event) =>
                      handleStockAdjustmentFieldChange("type", event.target.value)
                    }
                    disabled={isSubmittingStockAdjustment}
                  >
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                    <option value="ADJUSTMENT">ADJUSTMENT</option>
                  </select>
                </label>

                <label className="inventory-form-field inventory-form-field-wide">
                  <span>Reason</span>
                  <textarea
                    rows="3"
                    value={stockAdjustmentForm.reason}
                    onChange={(event) =>
                      handleStockAdjustmentFieldChange("reason", event.target.value)
                    }
                    disabled={isSubmittingStockAdjustment}
                  />
                </label>
              </div>

              {stockAdjustmentError ? (
                <div className="inventory-form-error">{stockAdjustmentError}</div>
              ) : null}

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="manager-ghost-button"
                  onClick={closeStockAdjustmentModal}
                  disabled={isSubmittingStockAdjustment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="manager-primary-button"
                  disabled={isSubmittingStockAdjustment}
                >
                  <RotateCw size={16} />
                  <span>{isSubmittingStockAdjustment ? "Saving..." : "Update Stock"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isEditProductOpen ? (
        <div className="inventory-modal-overlay">
          <div
            className="inventory-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
          >
            <div className="inventory-modal-head">
              <div>
                <h3 id="edit-product-title">Edit Product</h3>
                <p>Update product details in the live backend catalog.</p>
              </div>
              <button
                type="button"
                className="inventory-modal-close"
                onClick={closeEditProductModal}
                aria-label="Close edit product form"
              >
                <CircleX size={18} />
              </button>
            </div>

            <form className="inventory-modal-form" onSubmit={handleSubmitEditProduct}>
              <div className="inventory-form-grid">
                <label className="inventory-form-field">
                  <span>Product Name</span>
                  <input
                    type="text"
                    value={editProductForm.name}
                    onChange={(event) => handleEditProductFieldChange("name", event.target.value)}
                    disabled={isSubmittingEditProduct}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>SKU</span>
                  <input
                    type="text"
                    value={editProductForm.sku}
                    onChange={(event) => handleEditProductFieldChange("sku", event.target.value)}
                    disabled={isSubmittingEditProduct}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>Price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editProductForm.price}
                    onChange={(event) => handleEditProductFieldChange("price", event.target.value)}
                    disabled={isSubmittingEditProduct}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>Category</span>
                  <select
                    value={editProductForm.categoryId}
                    onChange={(event) =>
                      handleEditProductFieldChange("categoryId", event.target.value)
                    }
                    disabled={isSubmittingEditProduct || isCategoriesLoading}
                  >
                    <option value="">
                      {isCategoriesLoading ? "Loading categories..." : "Select category"}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categoriesError ? <small>{categoriesError}</small> : null}
                </label>

                <label className="inventory-form-field">
                  <span>Barcode</span>
                  <input
                    type="text"
                    value={editProductForm.barcode}
                    onChange={(event) =>
                      handleEditProductFieldChange("barcode", event.target.value)
                    }
                    disabled={isSubmittingEditProduct}
                  />
                </label>

                <label className="inventory-form-field">
                  <span>Image URL</span>
                  <input
                    type="url"
                    value={editProductForm.imageUrl}
                    onChange={(event) =>
                      handleEditProductFieldChange("imageUrl", event.target.value)
                    }
                    disabled={isSubmittingEditProduct}
                  />
                </label>

                <label className="inventory-form-field inventory-form-field-wide">
                  <span>Description</span>
                  <textarea
                    rows="4"
                    value={editProductForm.description}
                    onChange={(event) =>
                      handleEditProductFieldChange("description", event.target.value)
                    }
                    disabled={isSubmittingEditProduct}
                  />
                </label>

                <label className="inventory-toggle-field inventory-form-field-wide">
                  <input
                    type="checkbox"
                    checked={editProductForm.isActive}
                    onChange={(event) =>
                      handleEditProductFieldChange("isActive", event.target.checked)
                    }
                    disabled={isSubmittingEditProduct}
                  />
                  <span>Product is active</span>
                </label>
              </div>

              <div className="inventory-form-note">
                Stock updates stay in the dedicated stock adjustment flow.
              </div>

              {editProductError ? <div className="inventory-form-error">{editProductError}</div> : null}

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="manager-ghost-button"
                  onClick={closeEditProductModal}
                  disabled={isSubmittingEditProduct}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="manager-primary-button"
                  disabled={isSubmittingEditProduct}
                >
                  <Pencil size={16} />
                  <span>{isSubmittingEditProduct ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default Inventory;

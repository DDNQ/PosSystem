import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  CircleX,
  CakeSlice,
  Cookie,
  Crown,
  CupSoda,
  Mail,
  LogOut,
  Minus,
  Monitor,
  Package,
  Phone,
  Plus,
  QrCode,
  Receipt,
  RefreshCcw,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  UserRoundPlus,
  Wallet,
  BadgeDollarSign,
  CreditCard,
  Milk,
  MoreHorizontal,
} from "lucide-react";
import "../styles/pos.css";
import { formatCurrency } from "../utils/currency";
import {
  createCustomer,
  createSale,
  getCategories,
  getCustomers,
  getProductByBarcode,
  getProducts,
} from "../services/api";
import { getStoredToken, getStoredUser } from "../utils/auth";

const keypadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00"];
const TOAST_DURATION_MS = 2800;

const emptyCustomerForm = {
  name: "",
  phone: "",
  email: "",
};

const categoryPresentation = {
  dairy: { icon: Milk, tone: "dairy" },
  beverages: { icon: CupSoda, tone: "beverage" },
  snacks: { icon: Cookie, tone: "produce" },
  bakery: { icon: CakeSlice, tone: "bakery" },
  household: { icon: Package, tone: "butchery" },
  other: { icon: MoreHorizontal, tone: "other" },
};

function normalizeCategoryName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeCategory(category) {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
  };
}

function normalizeProduct(product) {
  return {
    id: product.id,
    sku: product.sku ?? "N/A",
    name: product.name,
    category: product.category?.name ?? "Uncategorized",
    price: Number(product.price) || 0,
    stock: Number(product.stock) || 0,
  };
}

function buildProductDisplayKey(product) {
  const normalizedName = String(product.name ?? "")
    .trim()
    .toLowerCase();
  const normalizedCategory = String(product.category ?? "")
    .trim()
    .toLowerCase();
  const normalizedPrice = Number(product.price) || 0;

  return `${normalizedName}::${normalizedCategory}::${normalizedPrice}`;
}

function dedupeProductsForDisplay(products) {
  const uniqueProducts = new Map();

  products.forEach((product) => {
    const dedupeKey = buildProductDisplayKey(product);
    const existingProduct = uniqueProducts.get(dedupeKey);

    if (!existingProduct) {
      uniqueProducts.set(dedupeKey, product);
      return;
    }

    const existingStock = Number(existingProduct.stock) || 0;
    const nextStock = Number(product.stock) || 0;

    if (nextStock > existingStock) {
      uniqueProducts.set(dedupeKey, product);
    }
  });

  return Array.from(uniqueProducts.values());
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getCashierDisplayName(user) {
  if (!user) {
    return "Cashier";
  }

  const fullName = [user.firstName, user.lastName]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  if (fullName) {
    return fullName;
  }

  if (user.name && String(user.name).trim()) {
    return String(user.name).trim();
  }

  if (user.email && String(user.email).trim()) {
    return String(user.email).trim();
  }

  return "Cashier";
}

function getMembershipTier(loyaltyPoints) {
  if (loyaltyPoints >= 500) {
    return { label: "Gold Member", tone: "gold" };
  }

  if (loyaltyPoints >= 100) {
    return { label: "Silver Member", tone: "silver" };
  }

  return { label: "Bronze Member", tone: "bronze" };
}

function normalizeCustomer(customer) {
  const loyaltyPoints = Number(customer?.loyaltyPoints) || 0;
  const membershipTier = getMembershipTier(loyaltyPoints);

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone || "Not provided",
    email: customer.email || "Not provided",
    loyaltyPoints,
    tier: membershipTier.label,
    tone: membershipTier.tone,
  };
}

function POS() {
  const navigate = useNavigate();
  const location = useLocation();
  const barcodeInputRef = useRef(null);
  const toastTimeoutsRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchPadValue, setSearchPadValue] = useState("");
  const [cashierName, setCashierName] = useState("Cashier");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerTab, setCustomerTab] = useState("find");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [attachedCustomer, setAttachedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState("");
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [categories, setCategories] = useState([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [products, setProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [terminalNotice, setTerminalNotice] = useState("Ready for scanning and checkout.");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [scanToasts, setScanToasts] = useState([]);

  useEffect(() => {
    const storedUser = getStoredUser();
    setCashierName(getCashierDisplayName(storedUser));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "F1") {
        return;
      }

      event.preventDefault();
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(
    () => () => {
      toastTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      toastTimeoutsRef.current.clear();
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setIsCategoriesLoading(true);
      setCategoriesError("");

      try {
        const data = await getCategories();

        if (!isMounted) {
          return;
        }

        setCategories(data.map(normalizeCategory));
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setCategoriesError(requestError.message || "Unable to load categories.");
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

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setIsProductsLoading(true);
      setProductsError("");

      try {
        const data = await getProducts();

        if (!isMounted) {
          return;
        }

        setProducts(data.map(normalizeProduct));
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setProductsError(requestError.message || "Unable to load products.");
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
    if (location.state?.openCustomerModal) {
      setIsCustomerModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    let isMounted = true;

    if (!isCustomerModalOpen || customerTab !== "find") {
      return () => {
        isMounted = false;
      };
    }

    const timeoutId = window.setTimeout(async () => {
      setIsCustomersLoading(true);
      setCustomersError("");

      try {
        const backendCustomers = await getCustomers();

        if (!isMounted) {
          return;
        }

        const normalizedSearchTerm = customerSearchTerm.trim().toLowerCase();
        const filteredCustomers = backendCustomers
          .map(normalizeCustomer)
          .filter((customer) => {
            if (!normalizedSearchTerm) {
              return true;
            }

            return (
              customer.name.toLowerCase().includes(normalizedSearchTerm) ||
              customer.phone.toLowerCase().includes(normalizedSearchTerm)
            );
          });

        setCustomers(filteredCustomers);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setCustomersError(requestError.message || "Unable to load customers.");
        setCustomers([]);
      } finally {
        if (isMounted) {
          setIsCustomersLoading(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [customerSearchTerm, customerTab, isCustomerModalOpen]);

  const categoryCards = useMemo(
    () => [
      {
        id: "all",
        name: "All",
        icon: MoreHorizontal,
        tone: "other",
      },
      ...categories.map((category) => {
        const presentation =
          categoryPresentation[normalizeCategoryName(category.name)] ??
          categoryPresentation.other;

        return {
          id: category.id,
          name: category.name,
          icon: presentation.icon,
          tone: presentation.tone,
        };
      }),
    ],
    [categories]
  );

  const predefinedCategoryNames = useMemo(
    () =>
      new Set(
        categories
          .filter((category) => normalizeCategoryName(category.name) !== "other")
          .map((category) => normalizeCategoryName(category.name))
      ),
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const visibleProducts = products.filter((product) => {
      const normalizedProductCategory = normalizeCategoryName(product.category);
      const normalizedSelectedCategory = normalizeCategoryName(selectedCategory);
      const matchesCategory =
        !normalizedSelectedCategory ||
        (normalizedSelectedCategory === "other"
          ? !predefinedCategoryNames.has(normalizedProductCategory)
          : normalizedProductCategory === normalizedSelectedCategory);
      const matchesSearch =
        !normalizedSearchTerm ||
        product.name.toLowerCase().includes(normalizedSearchTerm);

      return matchesCategory && matchesSearch;
    });

    return dedupeProductsForDisplay(visibleProducts);
  }, [predefinedCategoryNames, products, searchTerm, selectedCategory]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const showScanToast = (type, message) => {
    const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setScanToasts((currentToasts) => [...currentToasts, { id: toastId, type, message }]);

    const timeoutId = window.setTimeout(() => {
      setScanToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
      toastTimeoutsRef.current.delete(timeoutId);
    }, TOAST_DURATION_MS);

    toastTimeoutsRef.current.add(timeoutId);
  };

  const getAudioContext = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  };

  const playTone = async ({ frequencies, durationMs, type = "sine", gainValue = 0.035 }) => {
    const audioContext = await getAudioContext();

    if (!audioContext) {
      return;
    }

    const startTime = audioContext.currentTime;
    const gainNode = audioContext.createGain();

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + durationMs / 1000);
    gainNode.connect(audioContext.destination);

    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const toneStartTime = startTime + index * 0.045;
      const toneEndTime = toneStartTime + durationMs / 1000 - index * 0.01;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, toneStartTime);
      oscillator.connect(gainNode);
      oscillator.start(toneStartTime);
      oscillator.stop(Math.max(toneEndTime, toneStartTime + 0.03));
    });
  };

  const playSuccessBeep = () => {
    void playTone({
      frequencies: [1046.5, 1318.5],
      durationMs: 120,
      type: "sine",
      gainValue: 0.03,
    });
  };

  const playWarningBeep = () => {
    void playTone({
      frequencies: [440, 329.63],
      durationMs: 160,
      type: "triangle",
      gainValue: 0.035,
    });
  };

  const addProductToCart = (product, quantity = 1) => {
    if (product.stock <= 0) {
      const message = `${product.name} is currently out of stock.`;
      setTerminalNotice(message);
      return {
        status: "out_of_stock",
        message,
      };
    }

    let cartUpdateResult = {
      status: "added",
      message: `${product.name} added to cart.`,
    };

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        if (existingItem.quantity >= existingItem.stock) {
          cartUpdateResult = {
            status: "limit_reached",
            message: `Only ${existingItem.stock} unit(s) of ${existingItem.name} available.`,
          };
          return currentItems;
        }

        cartUpdateResult = {
          status: "added",
          message: `${existingItem.name} added to cart.`,
        };

        return currentItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }

      cartUpdateResult = {
        status: "added",
        message: `${product.name} added to cart.`,
      };

      return [...currentItems, { ...product, quantity }];
    });

    setTerminalNotice(cartUpdateResult.message);

    return cartUpdateResult;
  };

  const handleAddToCart = (product, quantity = 1) => {
    addProductToCart(product, quantity);
  };

  const handleIncreaseQuantity = (productId) => {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        if (item.quantity >= item.stock) {
          setTerminalNotice(`Only ${item.stock} unit(s) of ${item.name} available.`);
          return item;
        }

        return { ...item, quantity: item.quantity + 1 };
      })
    );
  };

  const handleDecreaseQuantity = (productId) => {
    setCartItems((currentItems) =>
      currentItems
        .map((item) => (item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (productId) => {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== productId));
  };

  const handleKeypadPress = (key) => {
    setSearchPadValue((currentValue) => `${currentValue}${key}`.slice(0, 12));
  };

  const handleClearPad = () => {
    setSearchPadValue((currentValue) => currentValue.slice(0, -1));
  };

  const focusBarcodeInput = () => {
    window.requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    });
  };

  const handleBarcodeLookup = async (barcodeValue) => {
    const normalizedBarcode = String(barcodeValue ?? "").trim();

    if (!normalizedBarcode) {
      setTerminalNotice("Enter or scan a barcode first.");
      focusBarcodeInput();
      return;
    }

    try {
      const product = normalizeProduct(await getProductByBarcode(normalizedBarcode));
      const result = addProductToCart(product);

      if (result.status === "added") {
        playSuccessBeep();
        showScanToast("success", `Added ${product.name} to cart`);
      } else if (result.status === "out_of_stock") {
        playWarningBeep();
        showScanToast("warning", `${product.name} is out of stock`);
      } else {
        playWarningBeep();
        showScanToast("warning", result.message);
      }
    } catch (error) {
      const message =
        error?.status === 404
          ? `Barcode "${normalizedBarcode}" not recognized`
          : error.message || "Unable to scan barcode right now.";

      setTerminalNotice(message);
      playWarningBeep();
      showScanToast("error", message);
    } finally {
      setSearchTerm("");
      focusBarcodeInput();
    }
  };

  const handleBarcodeInputKeyDown = async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    await handleBarcodeLookup(searchTerm);
  };

  const handleScanProduct = () => {
    focusBarcodeInput();
  };

  const handleKeypadBarcodeScan = async () => {
    await handleBarcodeLookup(searchPadValue);
    setSearchPadValue("");
  };

  const handleOpenPayment = async (method) => {
    if (!cartItems.length) {
      setTerminalNotice("Add at least one product before processing payment.");
      return;
    }

    const authToken = getStoredToken();

    if (!authToken) {
      setTerminalNotice("Unable to start checkout. Please sign in again.");
      return;
    }

    setIsCheckoutLoading(true);
    setTerminalNotice("Creating sale...");

    try {
      const sale = await createSale({
        customerId: attachedCustomer?.id,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      navigate("/payment", {
        state: {
          method,
          sale,
          saleId: sale?.id,
          subtotal: sale?.subtotal ?? subtotal,
          tax: sale?.tax ?? tax,
          total: sale?.total ?? total,
          customer: sale?.customer ?? attachedCustomer,
          items: cartItems,
        },
      });
    } catch (requestError) {
      setTerminalNotice(requestError.message || "Unable to create sale.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const attachCustomerToSale = (customer) => {
    setAttachedCustomer(customer || null);
    setIsCustomerModalOpen(false);
    setTerminalNotice(
      customer ? `${customer.name} attached to this sale.` : "Customer removed."
    );
  };

  const handleRegisterCustomer = async () => {
    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      setTerminalNotice("Customer name and phone are required.");
      return;
    }

    try {
      const createdCustomer = await createCustomer({
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim() || undefined,
      });

      const normalizedCustomer = normalizeCustomer(createdCustomer);

      setCustomerForm(emptyCustomerForm);
      setCustomerTab("find");
      setCustomerSearchTerm("");
      attachCustomerToSale(normalizedCustomer);
      setTerminalNotice(`${normalizedCustomer.name} registered and attached to this transaction.`);
    } catch (requestError) {
      setTerminalNotice(requestError.message || "Unable to register customer.");
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("posUser");
    navigate("/");
  };

  const cashierInitials = getInitials(cashierName) || "SJ";

  return (
    <main className="terminal-shell">
      <section className="terminal-frame">
        {scanToasts.length ? (
          <div className="terminal-toast-stack" aria-live="polite" aria-atomic="true">
            {scanToasts.map((toast) => (
              <div key={toast.id} className={`terminal-toast tone-${toast.type}`}>
                <span>{toast.message}</span>
              </div>
            ))}
          </div>
        ) : null}

        <header className="terminal-header">
          <div className="terminal-brand">
            <div className="terminal-brand-mark">
              <ShoppingCart size={21} />
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

        <div className="terminal-content">
          <aside className="terminal-left-panel">
            <div className="terminal-panel-section">
              <p className="terminal-panel-label">Input Methods</p>
              <button type="button" className="terminal-scan-button" onClick={handleScanProduct}>
                <ScanLine size={18} />
                <span>Scan Barcode (F1)</span>
              </button>

              <label className="terminal-search-field">
                <Search size={18} />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={handleBarcodeInputKeyDown}
                  placeholder="Search or scan item (F2)"
                  aria-label="Search item"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="terminal-panel-section">
              <p className="terminal-panel-label">Quick Categories</p>
              <div className="terminal-category-grid">
                {isCategoriesLoading ? (
                  <div className="terminal-result-card" aria-live="polite">
                    <div>
                      <strong>Loading categories...</strong>
                      <span>Fetching live category data</span>
                    </div>
                  </div>
                ) : categoriesError ? (
                  <div className="terminal-result-card" role="alert">
                    <div>
                      <strong>Unable to load categories</strong>
                      <span>{categoriesError}</span>
                    </div>
                  </div>
                ) : (
                  categoryCards.map((category) => {
                    const CategoryIcon = category.icon;
                    const isActive =
                      category.id === "all"
                        ? !selectedCategory
                        : selectedCategory === category.name;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={`terminal-category-card terminal-category-${category.tone} ${isActive ? "is-active" : ""}`}
                        onClick={() =>
                          setSelectedCategory(category.id === "all" ? "" : category.name)
                        }
                      >
                        <CategoryIcon size={24} />
                        <span>{category.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="terminal-product-results">
              <div className="terminal-results-head">
                <span>Available Items</span>
                <strong>{filteredProducts.length}</strong>
              </div>

              <div className="terminal-results-list">
                {isProductsLoading ? (
                  <div className="terminal-result-card" aria-live="polite">
                    <div>
                      <strong>Loading products...</strong>
                      <span>Fetching live catalog data</span>
                    </div>
                  </div>
                ) : productsError ? (
                  <div className="terminal-result-card" role="alert">
                    <div>
                      <strong>Unable to load products</strong>
                      <span>{productsError}</span>
                    </div>
                  </div>
                ) : filteredProducts.length ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className={`terminal-result-card${product.stock <= 0 ? " is-unavailable" : ""}`}
                      disabled={product.stock <= 0}
                      onClick={() => handleAddToCart(product)}
                    >
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.category} · {product.stock <= 0 ? "Out of Stock" : `Stock: ${product.stock}`}</span>
                      </div>
                      <b>{formatCurrency(product.price)}</b>
                    </button>
                  ))
                ) : (
                  <div className="terminal-result-card" aria-live="polite">
                    <div>
                      <strong>No matching products found</strong>
                      <span>No matching products found</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="terminal-side-actions">
              <button
                type="button"
                className="terminal-action-button"
                onClick={() => setIsCustomerModalOpen(true)}
              >
                <UserRoundPlus size={18} />
                <span>{attachedCustomer ? attachedCustomer.name : "Register / Attach Customer"}</span>
              </button>
              <button
                type="button"
                className="terminal-action-button"
                onClick={() => navigate("/returns")}
              >
                <RefreshCcw size={18} />
                <span>Process Return</span>
              </button>
            </div>
          </aside>

          <section className="terminal-basket-panel">
            <div className="terminal-basket-header">
              <div className="terminal-basket-title">
                <h2>Current Basket</h2>
                <span className="terminal-count-pill">{cartItems.length} Items</span>
              </div>

              <div className="terminal-basket-actions">
                <button type="button" className="terminal-mini-action">
                  <QrCode size={16} />
                  <span>Suspend</span>
                </button>
                <button type="button" className="terminal-mini-action">
                  <Receipt size={16} />
                  <span>Recall</span>
                </button>
              </div>
            </div>

            <div className="terminal-table-wrap">
              <table className="terminal-basket-table">
                <thead>
                  <tr>
                    <th>Product Description</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.length ? (
                    cartItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="terminal-product-cell">
                            <strong>{item.name}</strong>
                            <span>SKU: {item.sku}</span>
                          </div>
                        </td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>
                          <div className="terminal-qty-control">
                            <button
                              type="button"
                              className="terminal-qty-button"
                              aria-label={`Decrease quantity of ${item.name}`}
                              onClick={() => handleDecreaseQuantity(item.id)}
                            >
                              <Minus size={16} />
                            </button>
                            <strong>{item.quantity}</strong>
                            <button
                              type="button"
                              className="terminal-qty-button"
                              aria-label={`Increase quantity of ${item.name}`}
                              onClick={() => handleIncreaseQuantity(item.id)}
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              type="button"
                              className="terminal-remove-button"
                              aria-label={`Remove ${item.name}`}
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                        <td className="terminal-line-total">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="terminal-basket-empty-cell">
                        <div className="terminal-basket-empty-state">
                          <span className="terminal-basket-empty-icon" aria-hidden="true">
                            <ShoppingCart size={24} />
                          </span>
                          <strong>Your cart is empty</strong>
                          <span>Select a product card to add it to this sale.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="terminal-basket-footer">
              <div className="terminal-basket-footer-actions">
                <button type="button" className="terminal-text-action danger">
                  Void Transaction
                </button>
                <button type="button" className="terminal-text-action neutral">
                  Price Check
                </button>
              </div>

              <div className="terminal-summary-inline">
                <div>
                  <span>Status:</span>
                  <strong>{terminalNotice}</strong>
                </div>
              </div>
            </div>
          </section>

          <aside className="terminal-right-panel">
            <div className="terminal-total-card">
              <span>Grand Total</span>
              <div className="terminal-total-value">
                <small>GHS</small>
                <strong>{total.toFixed(2)}</strong>
              </div>
              <div className="terminal-summary-inline">
                <div>
                  <span>Subtotal:</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div>
                  <span>Tax (10%):</span>
                  <strong>{formatCurrency(tax)}</strong>
                </div>
              </div>
            </div>

            <div className="terminal-payment-actions">
              <button
                type="button"
                className="terminal-payment-button cash"
                disabled={isCheckoutLoading}
                onClick={() => handleOpenPayment("cash")}
              >
                <BadgeDollarSign size={24} />
                <span>{isCheckoutLoading ? "Processing..." : "Cash Payment"}</span>
              </button>

              <div className="terminal-split-payments">
                <button
                  type="button"
                  className="terminal-payment-button card"
                  disabled={isCheckoutLoading}
                  onClick={() => handleOpenPayment("card")}
                >
                  <CreditCard size={21} />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  className="terminal-payment-button wallet"
                  disabled={isCheckoutLoading}
                  onClick={() => handleOpenPayment("wallet")}
                >
                  <Wallet size={21} />
                  <span>Wallet</span>
                </button>
              </div>
            </div>

            <div className="terminal-keypad-card">
              <div className="terminal-keypad-head">
                <span>Scan / Qty Pad</span>
                <b>NUM LOCK</b>
              </div>

              <div className="terminal-keypad-display">{searchPadValue || " "}</div>

              <div className="terminal-keypad-grid">
                {keypadKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="terminal-keypad-button"
                    onClick={() => handleKeypadPress(key)}
                  >
                    {key}
                  </button>
                ))}

                <button
                  type="button"
                  className="terminal-keypad-button terminal-keypad-clear"
                  onClick={handleClearPad}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="terminal-keypad-footer">
                <button type="button" className="terminal-keypad-meta" onClick={handleKeypadBarcodeScan}>
                  Scan SKU
                </button>
                <button
                  type="button"
                  className="terminal-keypad-meta"
                  onClick={() => setSearchTerm(searchPadValue)}
                >
                  Use as Search
                </button>
              </div>
            </div>
          </aside>
        </div>

        <footer className="terminal-footer">
          <div className="terminal-footer-status">
            <span className="terminal-status-dot" aria-hidden="true" />
            <span>System Connected</span>
          </div>
          <div className="terminal-footer-session">
            Current Session: <strong>{formatCurrency(total)}</strong>
          </div>
          <div className="terminal-footer-copy">
            <span>&copy; 2024 Supermarket POS</span>
            <button type="button">Keyboard Shortcuts</button>
          </div>
        </footer>

        {isCustomerModalOpen ? (
          <div className="customer-loyalty-overlay">
            <div className="customer-loyalty-modal" role="dialog" aria-modal="true">
              <div className="customer-loyalty-header">
                <div className="customer-loyalty-title">
                  <span className="customer-loyalty-title-icon">
                    <UserRoundPlus size={22} />
                  </span>
                  <div>
                    <h3>Customer Loyalty</h3>
                    <p>Search for existing members or register a new account</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="customer-loyalty-close"
                  onClick={() => setIsCustomerModalOpen(false)}
                  aria-label="Close customer loyalty dialog"
                >
                  <CircleX size={22} />
                </button>
              </div>

              <div className="customer-loyalty-tabs">
                <button
                  type="button"
                  className={`customer-loyalty-tab ${customerTab === "find" ? "is-active" : ""}`}
                  onClick={() => setCustomerTab("find")}
                >
                  <Search size={17} />
                  <span>Find Customer</span>
                </button>
                <button
                  type="button"
                  className={`customer-loyalty-tab ${customerTab === "new" ? "is-active" : ""}`}
                  onClick={() => setCustomerTab("new")}
                >
                  <UserRoundPlus size={17} />
                  <span>New Customer</span>
                </button>
              </div>

              <div className="customer-loyalty-body">
                {customerTab === "find" ? (
                  <>
                    <label className="customer-loyalty-search">
                      <Search size={19} />
                      <input
                        type="text"
                        value={customerSearchTerm}
                        onChange={(event) => setCustomerSearchTerm(event.target.value)}
                        placeholder="Search customer by phone or name"
                        aria-label="Search customer"
                      />
                    </label>

                    <div className="customer-loyalty-results-head">
                      <span>Matches for "{customerSearchTerm || "all"}"</span>
                      <strong>{customers.length} Found</strong>
                    </div>

                    <div className="customer-loyalty-list">
                      {isCustomersLoading ? (
                        <div className="customer-loyalty-empty">
                          <Crown size={22} />
                          <strong>Loading customers</strong>
                          <span>Searching the customer database...</span>
                        </div>
                      ) : customersError ? (
                        <div className="customer-loyalty-empty">
                          <Crown size={22} />
                          <strong>Unable to load customers</strong>
                          <span>{customersError}</span>
                        </div>
                      ) : customers.map((customer) => (
                        <article
                          key={customer.id}
                          className={`customer-loyalty-card ${attachedCustomer?.id === customer.id ? "is-selected" : ""}`}
                        >
                          <div className="customer-loyalty-person">
                            <div className={`customer-loyalty-avatar tone-${customer.tone}`}>
                              <UserRound size={24} />
                            </div>

                            <div className="customer-loyalty-copy">
                              <div className="customer-loyalty-name-row">
                                <strong>{customer.name}</strong>
                                <span className={`customer-tier-badge tone-${customer.tone}`}>
                                  {customer.tier}
                                </span>
                              </div>

                              <div className="customer-loyalty-meta">
                                <span>
                                  <Phone size={14} />
                                  {customer.phone}
                                </span>
                                <span>
                                  <Mail size={14} />
                                  {customer.email}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="customer-loyalty-points">
                            <span>Loyalty Points</span>
                            <strong>{customer.loyaltyPoints.toLocaleString()}</strong>
                          </div>

                          <button
                            type="button"
                            className="customer-loyalty-select"
                            onClick={() => attachCustomerToSale(customer)}
                          >
                            <span>Attach</span>
                            <ChevronRight size={16} />
                          </button>
                        </article>
                      ))}

                      {!isCustomersLoading && !customersError && !customers.length ? (
                        <div className="customer-loyalty-empty">
                          <Crown size={22} />
                          <strong>No customers found</strong>
                          <span>Try another phone number or customer name.</span>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="customer-register-form">
                    <label className="customer-loyalty-search customer-register-field">
                      <UserRound size={19} />
                      <input
                        type="text"
                        value={customerForm.name}
                        onChange={(event) =>
                          setCustomerForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Customer full name"
                        aria-label="Customer full name"
                      />
                    </label>
                    <label className="customer-loyalty-search customer-register-field">
                      <Phone size={19} />
                      <input
                        type="text"
                        value={customerForm.phone}
                        onChange={(event) =>
                          setCustomerForm((current) => ({ ...current, phone: event.target.value }))
                        }
                        placeholder="Phone number"
                        aria-label="Customer phone number"
                      />
                    </label>
                    <label className="customer-loyalty-search customer-register-field">
                      <Mail size={19} />
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(event) =>
                          setCustomerForm((current) => ({ ...current, email: event.target.value }))
                        }
                        placeholder="Email address"
                        aria-label="Customer email address"
                      />
                    </label>

                    <div className="customer-register-note">
                      <strong>Cashier registration</strong>
                      <span>
                        New customers are created instantly and attached to the active sale.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="customer-loyalty-footer">
                <button
                  type="button"
                  className="customer-loyalty-link"
                  onClick={() => {
                    setCustomerSearchTerm("");
                    setCustomerForm(emptyCustomerForm);
                    setIsCustomerModalOpen(false);
                  }}
                >
                  Discard Changes
                </button>

                <div className="customer-loyalty-footer-actions">
                  <button
                    type="button"
                    className="customer-loyalty-secondary"
                    onClick={() => setIsCustomerModalOpen(false)}
                  >
                    Exit
                  </button>
                  {customerTab === "new" ? (
                    <button
                      type="button"
                      className="customer-loyalty-primary"
                      onClick={handleRegisterCustomer}
                    >
                      Register Customer
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default POS;


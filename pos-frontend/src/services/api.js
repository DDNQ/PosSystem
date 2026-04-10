import { getStoredToken } from "../utils/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function buildQueryString(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function getAuthHeaders() {
  const token = getStoredToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseJsonSafely(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function handleResponse(response) {
  const data = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      "Something went wrong. Please try again.";

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  return handleResponse(response);
}

export async function postJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function patchJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function putJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export function loginUser(credentials) {
  return postJson("/api/auth/login", credentials);
}

export function getDashboardSummary() {
  return getJson("/api/dashboard");
}

export function getDailySalesReport(params) {
  return getJson(`/api/reports/daily-sales${buildQueryString(params)}`);
}

export async function getProductPerformanceReport(params) {
  const data = await getJson(`/api/reports/product-performance${buildQueryString(params)}`);
  return data?.products ?? [];
}

export async function getPaymentSummaryReport(params) {
  const data = await getJson(`/api/reports/payment-summary${buildQueryString(params)}`);
  return data?.payments ?? [];
}

export async function getProducts() {
  const data = await getJson("/api/products");
  return data?.products ?? [];
}

export async function getProductByBarcode(barcode) {
  const data = await getJson(`/api/products/barcode/${encodeURIComponent(barcode)}`);
  return data?.product ?? null;
}

export async function getLowStockProducts() {
  const data = await getJson("/api/inventory/low-stock");
  return data?.products ?? [];
}

export async function getCategories() {
  const data = await getJson("/api/categories");
  return data?.categories ?? [];
}

export async function getCustomers() {
  const data = await getJson("/api/customers");
  return data?.customers ?? [];
}

export async function getCustomerHistoryAnalytics() {
  const data = await getJson("/api/customers/history");
  return {
    summary: data?.summary ?? null,
    history: data?.history ?? [],
  };
}

export async function getCashierPerformanceAnalytics() {
  const data = await getJson("/api/cashiers/performance");
  return {
    summary: data?.summary ?? null,
    cashiers: data?.cashiers ?? [],
  };
}

export async function getAdminSalesOverview() {
  const data = await getJson("/api/admin/sales");
  return {
    summary: data?.summary ?? null,
    sales: data?.sales ?? [],
  };
}

export async function getAdminUsersOverview() {
  const data = await getJson("/api/admin/users");
  return {
    summary: data?.summary ?? null,
    users: data?.users ?? [],
  };
}

export async function createAdminUser(payload) {
  const data = await postJson("/api/admin/users", payload);
  return data?.user ?? null;
}

export async function getReturnReceipt(receiptNumber) {
  return getJson(`/api/returns/receipt/${encodeURIComponent(receiptNumber)}`);
}

export async function createCustomer(payload) {
  const data = await postJson("/api/customers", payload);
  return data?.customer;
}

export async function createProduct(payload) {
  const data = await postJson("/api/products", payload);
  return data?.product;
}

export async function createSale(payload) {
  const data = await postJson("/api/sales", payload);
  return data?.sale;
}

export async function createPayment(payload) {
  const data = await postJson("/api/payments", payload);
  return data?.payment;
}

export async function createReturn(payload) {
  return postJson("/api/returns", payload);
}

export async function adjustInventory(productId, payload) {
  return patchJson(`/api/inventory/${encodeURIComponent(productId)}/adjust`, payload);
}

export async function updateProduct(productId, payload) {
  const data = await putJson(`/api/products/${encodeURIComponent(productId)}`, payload);
  return data?.product;
}

export async function initializePaystackPayment(payload) {
  return postJson("/api/payments/paystack/initialize", payload);
}

export async function verifyPaystackPayment(reference) {
  return getJson(`/api/payments/paystack/verify/${encodeURIComponent(reference)}`);
}

export async function getReceipt(saleId) {
  return getJson(`/api/receipts/${encodeURIComponent(saleId)}`);
}

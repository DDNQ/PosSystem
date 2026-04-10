const LAST_RECEIPT_SALE_ID_KEY = "pos-last-receipt-sale-id";

export function storeReceiptSaleId(saleId) {
  if (!saleId) {
    return;
  }

  window.sessionStorage.setItem(LAST_RECEIPT_SALE_ID_KEY, String(saleId));
}

export function readStoredReceiptSaleId() {
  const storedValue = window.sessionStorage.getItem(LAST_RECEIPT_SALE_ID_KEY);

  if (!storedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(storedValue, 10);

  return Number.isNaN(parsedValue) || parsedValue <= 0 ? null : parsedValue;
}

export function clearStoredReceiptSaleId() {
  window.sessionStorage.removeItem(LAST_RECEIPT_SALE_ID_KEY);
}

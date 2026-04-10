export const dashboardStats = [
  { label: "Gross Sales", value: "$18,240", meta: "Today" },
  { label: "Transactions", value: "126", meta: "Average basket $144" },
  { label: "Returning Customers", value: "42%", meta: "Up 6% this week" },
];

export const activityRows = [
  ["09:12 AM", "Checkout completed", "INV-10328"],
  ["10:05 AM", "Stock adjusted", "Sparkling Water"],
  ["11:48 AM", "User created", "Cashier 04"],
];

export const categories = [
  { name: "Beverages", count: 24 },
  { name: "Bakery", count: 18 },
  { name: "Snacks", count: 14 },
  { name: "Frozen", count: 9 },
];

export const basketRows = [
  ["Iced Latte", "2", "$10.00"],
  ["Blueberry Muffin", "1", "$4.50"],
  ["Mineral Water", "3", "$6.75"],
];

export const paymentMethods = [
  { name: "Card", share: "62%" },
  { name: "Cash", share: "24%" },
  { name: "Mobile Money", share: "14%" },
];

export const paymentRows = [
  ["INV-10328", "Card", "$86.20"],
  ["INV-10329", "Cash", "$14.50"],
  ["INV-10330", "Mobile Money", "$42.00"],
];

export const receiptLines = [
  ["Americano", "1 x $4.50", "$4.50"],
  ["Chicken Wrap", "2 x $7.25", "$14.50"],
  ["Fruit Juice", "1 x $3.75", "$3.75"],
];

export const returnsRows = [
  ["RCPT-2001", "Damaged item", "$12.00"],
  ["RCPT-2004", "Wrong size", "$18.50"],
  ["RCPT-2008", "Duplicate charge", "$9.25"],
];

export const inventoryRows = [
  ["Espresso Beans", "24 bags", "Reorder at 10"],
  ["Paper Cups", "180 pcs", "Healthy"],
  ["Oat Milk", "8 cartons", "Low stock"],
];

export const purchaseOrderRows = [
  ["PO-7842", "Bean & Brew Co.", "In transit"],
  ["PO-7843", "Fresh Dairy", "Awaiting approval"],
  ["PO-7844", "PackRight Supplies", "Delivered"],
];

export const reportStats = [
  { label: "Weekly Revenue", value: "$84,320", meta: "Last 7 days" },
  { label: "Top Category", value: "Beverages", meta: "By volume" },
  { label: "Average Ticket", value: "$27.18", meta: "Across all registers" },
];

export const userRows = [
  ["Ama Serwaa", "Manager", "Active"],
  ["Kojo Antwi", "Cashier", "Active"],
  ["Naa Dei", "Inventory Lead", "Invited"],
];

export const auditRows = [
  ["12:05", "Updated tax setting", "Admin"],
  ["12:14", "Voided transaction INV-10330", "Manager"],
  ["12:20", "Created purchase order PO-7844", "Procurement"],
];

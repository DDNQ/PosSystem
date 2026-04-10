export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
};

export const roleLabels = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.MANAGER]: "Manager",
  [ROLES.CASHIER]: "Cashier",
};

export const roleHomePaths = {
  [ROLES.ADMIN]: "/dashboard",
  [ROLES.MANAGER]: "/dashboard",
  [ROLES.CASHIER]: "/pos",
};

const USER_STORAGE_KEY = "posUser";
const TOKEN_STORAGE_KEY = "posToken";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeAuthenticatedUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const userId = String(user.id ?? "").trim();

  if (!UUID_PATTERN.test(userId)) {
    return null;
  }

  const firstName = String(user.firstName ?? "").trim();
  const lastName = String(user.lastName ?? "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    ...user,
    id: userId,
    firstName,
    lastName,
    name: fullName || String(user.name ?? "").trim() || String(user.email ?? "").trim(),
    email: String(user.email ?? "").trim(),
    role: String(user.role ?? "").trim(),
  };
}

export function storeAuthSession({ token, user }) {
  const normalizedToken = String(token ?? "").trim();
  const normalizedUser = normalizeAuthenticatedUser(user);

  if (!normalizedToken || !normalizedUser) {
    clearStoredUser();
    throw new Error("Unable to sign in. Invalid login response.");
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, normalizedToken);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser() {
  const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return normalizeAuthenticatedUser(JSON.parse(storedUser));
  } catch {
    return null;
  }
}

export function getStoredUserId() {
  const user = getStoredUser();
  const userId = String(user?.id ?? "").trim();

  if (!UUID_PATTERN.test(userId)) {
    return null;
  }

  return userId;
}

export function clearStoredUser() {
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

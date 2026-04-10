const bcrypt = require("bcrypt");

const prisma = require("../config/prisma");
const { generateToken } = require("../utils/jwt");
const { splitName, sanitizeUser } = require("../utils/user");

const ALLOWED_ROLES = ["ADMIN", "MANAGER", "CASHIER"];
const ALLOWED_STATUSES = ["ACTIVE", "INVITED", "DISABLED"];
const SALT_ROUNDS = 10;

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeRole = (role) => role?.trim().toUpperCase();
const normalizeStatus = (status) => status?.trim().toUpperCase();

const registerUser = async ({ name, email, password, role }) => {
  if (!name || !email || !password) {
    throw createError("Name, email, and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = normalizeRole(role);

  if (normalizedRole && !ALLOWED_ROLES.includes(normalizedRole)) {
    throw createError("Invalid role provided", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw createError("User with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { firstName, lastName } = splitName(name);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      role: normalizedRole || "CASHIER",
      status: "ACTIVE",
      isActive: true,
    },
  });

  return sanitizeUser(user);
};

const loginUser = async ({ email, password, role }) => {
  if (!email || !password || !role) {
    throw createError("Email, password, and role are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = normalizeRole(role);

  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    throw createError("Invalid role provided", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw createError("Invalid email or password", 401);
  }

  if (!user.isActive || normalizeStatus(user.status) === "DISABLED") {
    throw createError("This account is disabled", 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw createError("Invalid email or password", 401);
  }

  if (user.role !== normalizedRole) {
    throw createError("Invalid role for this account", 401);
  }

  const safeUser = sanitizeUser(user);
  const token = generateToken({
    id: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
  });

  return {
    token,
    user: safeUser,
  };
};

module.exports = {
  registerUser,
  loginUser,
  ALLOWED_ROLES,
  ALLOWED_STATUSES,
  SALT_ROUNDS,
  createError,
  normalizeRole,
  normalizeStatus,
};

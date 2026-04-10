const splitName = (fullName) => {
  const trimmedName = fullName.trim().replace(/\s+/g, " ");
  const nameParts = trimmedName.split(" ");

  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || nameParts[0];

  return {
    firstName,
    lastName,
  };
};

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  name: `${user.firstName} ${user.lastName}`.trim(),
  role: user.role,
  branch: user.branch ?? null,
  status: user.status ?? (user.isActive ? "ACTIVE" : "DISABLED"),
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

module.exports = {
  splitName,
  sanitizeUser,
};

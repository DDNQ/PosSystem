import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Search, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import "../styles/dashboard.css";
import "../styles/reports.css";
import "../styles/role-pages.css";
import { createAdminUser, getAdminUsersOverview } from "../services/api";

const supportedRoles = [
  {
    id: "ADMIN",
    label: "Admin",
    scope:
      "Full system oversight across users, inventory, products, reports, and all sales activity.",
  },
  {
    id: "MANAGER",
    label: "Manager",
    scope:
      "Operational visibility for store performance, sales monitoring, reporting, and day-to-day supervision.",
  },
  {
    id: "CASHIER",
    label: "Cashier",
    scope:
      "Frontline POS access for selling products, handling payments, scanning items, and processing returns.",
  },
];

const userStatusOptions = ["ACTIVE", "INVITED", "DISABLED"];

const emptyUserForm = {
  fullName: "",
  email: "",
  role: "CASHIER",
  branch: "",
  status: "INVITED",
  temporaryPassword: "",
};

function formatRole(role) {
  return String(role ?? "")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusTone(status) {
  if (status === "DISABLED") {
    return "danger";
  }

  return "neutral";
}

function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState({
    totalUsers: 0,
    managers: 0,
    cashiers: 0,
  });
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userFormError, setUserFormError] = useState("");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAdminUsers = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await getAdminUsersOverview();

        if (!isMounted) {
          return;
        }

        setSummary({
          totalUsers: data.summary?.totalUsers ?? 0,
          managers: data.summary?.managers ?? 0,
          cashiers: data.summary?.cashiers ?? 0,
        });
        setUsers(data.users ?? []);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError("Unable to load users right now.");
        setSummary({
          totalUsers: 0,
          managers: 0,
          cashiers: 0,
        });
        setUsers([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAdminUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadAdminUsers = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getAdminUsersOverview();

      setSummary({
        totalUsers: data.summary?.totalUsers ?? 0,
        managers: data.summary?.managers ?? 0,
        cashiers: data.summary?.cashiers ?? 0,
      });
      setUsers(data.users ?? []);
    } catch (requestError) {
      setError("Unable to load users right now.");
      setSummary({
        totalUsers: 0,
        managers: 0,
        cashiers: 0,
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) =>
      `${user.name} ${user.role} ${user.branch}`.toLowerCase().includes(normalizedSearch)
    );
  }, [searchTerm, users]);

  const handleUserFormChange = (field, value) => {
    setUserFormError("");
    setUserForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleCloseAddUserModal = () => {
    setIsAddUserModalOpen(false);
    setUserForm(emptyUserForm);
    setUserFormError("");
    setIsSubmittingUser(false);
  };

  const handleSubmitNewUser = async () => {
    if (
      !userForm.fullName.trim() ||
      !userForm.email.trim() ||
      !userForm.role.trim() ||
      !userForm.status.trim() ||
      !userForm.temporaryPassword.trim()
    ) {
      setUserFormError(
        "Full name, email, role, status, and temporary password are required."
      );
      return;
    }

    setIsSubmittingUser(true);
    setUserFormError("");
    setSuccessMessage("");

    try {
      await createAdminUser({
        fullName: userForm.fullName.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
        branch: userForm.branch.trim(),
        status: userForm.status,
        temporaryPassword: userForm.temporaryPassword,
      });

      await loadAdminUsers();
      handleCloseAddUserModal();
      setSuccessMessage("User created successfully.");
    } catch (requestError) {
      setUserFormError(requestError.message || "Unable to create user.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  return (
    <section className="manager-content">
      <div className="manager-hero">
        <div>
          <h2>User Management</h2>
          <p>Create, review, and manage staff access across the POS platform.</p>
          {error ? <p>{error}</p> : null}
          {successMessage ? <p>{successMessage}</p> : null}
        </div>

        <div className="manager-hero-actions">
          <button
            type="button"
            className="manager-ghost-button"
            onClick={() => setIsRolesModalOpen(true)}
          >
            <ShieldCheck size={16} />
            <span>Review Roles</span>
          </button>
          <button
            type="button"
            className="manager-primary-button"
            onClick={() => {
              setSuccessMessage("");
              setIsAddUserModalOpen(true);
            }}
          >
            <UserPlus size={16} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="role-stat-grid">
        <article className="role-stat-card">
          <span>Total Users</span>
          <strong>{isLoading ? "--" : summary.totalUsers}</strong>
          <p>{isLoading ? "Loading users..." : "Across all user accounts"}</p>
        </article>
        <article className="role-stat-card">
          <span>Managers</span>
          <strong>{isLoading ? "--" : summary.managers}</strong>
          <p>{isLoading ? "Loading managers..." : "Users with manager access"}</p>
        </article>
        <article className="role-stat-card">
          <span>Cashiers</span>
          <strong>{isLoading ? "--" : summary.cashiers}</strong>
          <p>{isLoading ? "Loading cashiers..." : "Users with cashier access"}</p>
        </article>
      </div>

      <section className="reports-table-card">
        <div className="reports-table-head">
          <div>
            <h3>Staff Directory</h3>
            <p>Manage store personnel, access levels, and onboarding state.</p>
          </div>
          <div className="role-inline-search">
            <Search size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search users..."
              aria-label="Search users"
            />
          </div>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4">Loading user directory from the backend...</td>
                </tr>
              ) : !filteredUsers.length ? (
                searchTerm.trim() ? (
                  <tr>
                    <td colSpan="4">No matching users were found.</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="4" className="role-table-empty-cell">
                      <div className="role-table-empty-state">
                        <strong>No users have been added yet</strong>
                        <p>
                          Staff accounts will appear here once administrators start creating and
                          inviting users.
                        </p>
                      </div>
                    </td>
                  </tr>
                )
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="role-entity-cell">
                      <span className="role-entity-icon">
                        <Users size={16} />
                      </span>
                      <strong>{user.name}</strong>
                    </td>
                    <td>{formatRole(user.role)}</td>
                    <td>{user.branch || "Not assigned"}</td>
                    <td>
                      <span className={`reports-status-pill ${getStatusTone(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="reports-tip-card">
        <span className="reports-tip-icon">
          <BadgeCheck size={18} />
        </span>
        <div>
          <strong>Admin Role Scope</strong>
          <p>
            Admin users can manage users, maintain the product catalog, oversee stock,
            review reports, and inspect all sales records.
          </p>
        </div>
      </section>

      {isRolesModalOpen ? (
        <div className="ui-modal-backdrop" onClick={() => setIsRolesModalOpen(false)}>
          <div
            className="ui-modal reports-sale-modal reports-roles-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-roles-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ui-modal-header reports-sale-modal-header">
              <div>
                <h3 id="review-roles-title">System Roles</h3>
                <p>Reference the active role definitions currently supported across the POS app.</p>
              </div>
              <button
                type="button"
                className="manager-icon-button"
                onClick={() => setIsRolesModalOpen(false)}
                aria-label="Close role review"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ui-modal-body reports-sale-modal-body">
              <div className="reports-payment-summary">
                {supportedRoles.map((role) => (
                  <article key={role.id} className="reports-payment-row reports-role-definition">
                    <span className="reports-tip-icon reports-role-definition-icon">
                      <ShieldCheck size={16} />
                    </span>
                    <div className="reports-payment-copy">
                      <strong>{role.label}</strong>
                      <p>{role.scope}</p>
                    </div>
                    <b>{role.id}</b>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isAddUserModalOpen ? (
        <div className="ui-modal-backdrop" onClick={() => setIsAddUserModalOpen(false)}>
          <div
            className="ui-modal reports-sale-modal reports-roles-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ui-modal-header reports-sale-modal-header">
              <div>
                <h3 id="add-user-title">Add User</h3>
                <p>Prepare a new staff profile with role, branch, and account status details.</p>
              </div>
              <button
                type="button"
                className="manager-icon-button"
                onClick={() => setIsAddUserModalOpen(false)}
                aria-label="Close add user modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ui-modal-body reports-sale-modal-body">
              <div className="reports-user-form-grid">
                <label className="reports-filter-field">
                  <span>Full Name</span>
                  <div className="reports-input-shell">
                    <input
                      type="text"
                      value={userForm.fullName}
                      onChange={(event) => handleUserFormChange("fullName", event.target.value)}
                      placeholder="Enter full name"
                      aria-label="Full name"
                    />
                  </div>
                </label>

                <label className="reports-filter-field">
                  <span>Email</span>
                  <div className="reports-input-shell">
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(event) => handleUserFormChange("email", event.target.value)}
                      placeholder="Enter email address"
                      aria-label="Email"
                    />
                  </div>
                </label>

                <label className="reports-filter-field">
                  <span>Role</span>
                  <div className="reports-input-shell">
                    <select
                      value={userForm.role}
                      onChange={(event) => handleUserFormChange("role", event.target.value)}
                      aria-label="Role"
                    >
                      {supportedRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="reports-filter-field">
                  <span>Branch</span>
                  <div className="reports-input-shell">
                    <input
                      type="text"
                      value={userForm.branch}
                      onChange={(event) => handleUserFormChange("branch", event.target.value)}
                      placeholder="Enter branch or location"
                      aria-label="Branch"
                    />
                  </div>
                </label>

                <label className="reports-filter-field">
                  <span>Status</span>
                  <div className="reports-input-shell">
                    <select
                      value={userForm.status}
                      onChange={(event) => handleUserFormChange("status", event.target.value)}
                      aria-label="Status"
                    >
                      {userStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="reports-filter-field">
                  <span>Temporary Password</span>
                  <div className="reports-input-shell">
                    <input
                      type="password"
                      value={userForm.temporaryPassword}
                      onChange={(event) =>
                        handleUserFormChange("temporaryPassword", event.target.value)
                      }
                      placeholder="Enter temporary password"
                      aria-label="Temporary password"
                    />
                  </div>
                </label>
              </div>

              {userFormError ? (
                <div className="reports-feedback reports-feedback-error">{userFormError}</div>
              ) : null}
            </div>

            <div className="ui-modal-footer reports-user-modal-footer">
              <button
                type="button"
                className="manager-secondary-button"
                onClick={handleCloseAddUserModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="manager-primary-button reports-disabled-submit"
                disabled={isSubmittingUser}
                onClick={handleSubmitNewUser}
              >
                {isSubmittingUser ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default UserManagement;

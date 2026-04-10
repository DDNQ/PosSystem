import { Navigate, Route, Routes } from "react-router-dom";
import ManagerLayout from "../components/layout/ManagerLayout";
import Login from "../pages/Login";
import AllSales from "../pages/AllSales";
import CashierPerformance from "../pages/CashierPerformance";
import CustomerHistory from "../pages/CustomerHistory";
import Dashboard from "../pages/Dashboard";
import EditProduct from "../pages/EditProduct";
import Inventory from "../pages/Inventory";
import POS from "../pages/POS";
import Payment from "../pages/Payment";
import PaymentCallback from "../pages/PaymentCallback";
import Receipt from "../pages/Receipt";
import Reports from "../pages/Reports";
import Returns from "../pages/Returns";
import UserManagement from "../pages/UserManagement";
import { getStoredUser, roleHomePaths, ROLES } from "../utils/auth";

function ProtectedRoute({ allowedRoles, children }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomePaths[user.role] ?? "/"} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
            <ManagerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/edit-product"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <EditProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/all-sales"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <AllSales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-history"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
              <CustomerHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cashier-performance"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
              <CashierPerformance />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route
        path="/pos"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CASHIER]}>
            <POS />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CASHIER]}>
            <Payment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/callback"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CASHIER]}>
            <PaymentCallback />
          </ProtectedRoute>
        }
      />
      <Route
        path="/returns"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CASHIER]}>
            <Returns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/receipt"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CASHIER]}>
            <Receipt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/receipt/:saleId"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CASHIER]}>
            <Receipt />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;

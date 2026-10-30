import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/AdminDashboard';
import { OperatorDashboard } from './pages/OperatorDashboard';
import { InventoryList } from './pages/InventoryList';
import { CreateOrder } from './pages/CreateOrder';
import { OrderList } from './pages/OrderList';
import { StockHistory } from './pages/StockHistory';
import { Analytics } from './pages/Analytics';
import { UserManagement } from './pages/UserManagement';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-r-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Admin Only Route Guard
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-r-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/operator" replace />;
  }

  return children;
};

// Public Route Guard (Redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/operator'} replace />;
  }

  return children;
};

// Root index redirector
const RootRedirect = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={isAdmin ? '/admin' : '/operator'} replace />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#0f172a'
                }
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#0f172a'
                }
              }
            }}
          />

          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Authenticated Dashboard Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RootRedirect />} />

              {/* Admin Dashboard */}
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />

              {/* Operator Dashboard */}
              <Route path="operator" element={<OperatorDashboard />} />

              {/* Inventory Management */}
              <Route path="inventory" element={<InventoryList />} />

              {/* Orders */}
              <Route path="orders" element={<OrderList />} />
              <Route path="orders/new" element={<CreateOrder />} />

              {/* Stock Movement Audit History */}
              <Route path="history" element={<StockHistory />} />

              {/* Analytics & Reports (Admin) */}
              <Route
                path="analytics"
                element={
                  <AdminRoute>
                    <Analytics />
                  </AdminRoute>
                }
              />

              {/* User Management (Admin Only) */}
              <Route
                path="users"
                element={
                  <AdminRoute>
                    <UserManagement />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

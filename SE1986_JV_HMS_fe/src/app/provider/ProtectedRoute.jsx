import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthsContext.jsx';

export default function ProtectedRoute({
  children,
  requiredPermission,
  roles,
}) {
  const { isAuthenticated, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const hasRequiredRole = !roles || roles.some(hasRole);
  if (
    (requiredPermission && !hasPermission(requiredPermission)) ||
    !hasRequiredRole
  ) {
    return (
      <main className="container py-5">
        <div className="alert alert-danger" role="alert">
          <h1 className="h4">403 · Không có quyền truy cập</h1>
          <p className="mb-0">
            Tài khoản hiện tại không được cấp quyền sử dụng chức năng này.
          </p>
        </div>
      </main>
    );
  }

  return children || <Outlet />;
}

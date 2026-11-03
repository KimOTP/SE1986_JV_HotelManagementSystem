import { Navigate, Outlet } from 'react-router';
import { useAuth } from './AuthsContext';
import { PERMISSIONS } from '../../modules/auths/constants/authConstants';

export default function HousekeepingRouteGuard() {
  const { isAuthenticated, hasPermission } = useAuth();

  // 1. Chưa đăng nhập -> Về trang Login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: '/operations/dashboard' } }}
      />
    );
  }

  // 2. Đã đăng nhập nhưng không có quyền xem
  if (!hasPermission(PERMISSIONS.HOUSEKEEPING_VIEW)) {
    return (
      <div className="container py-5 text-center">
        <h3 className="text-danger fw-bold">Truy cập bị từ chối</h3>
        <p className="text-muted">
          Bạn không có quyền truy cập vào khu vực Vận hành (Housekeeping).
        </p>
      </div>
    );
  }

  // 3. Hợp lệ -> Render các Route con
  return <Outlet />;
}
import { Link, useLocation, useNavigate } from 'react-router';

import LoginForm from '../components/LoginForm';
import { ROLES } from '../constants/authConstants';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSuccess = (user) => {
    const requestedLocation = location.state?.from;
    const roleHome = {
      [ROLES.ADMIN]: '/users',
      [ROLES.MANAGER]: '/bookings',
      [ROLES.STAFF]: '/operations/my-tasks',
      [ROLES.CUSTOMER]: '/bookings',
    };
    const destination =
      requestedLocation?.pathname && requestedLocation.pathname !== '/'
        ? requestedLocation
        : roleHome[user.role] || '/profile';
    navigate(destination, { replace: true });
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <h2 className="mb-2">Đăng nhập</h2>

                <p className="text-muted mb-0">
                  Đăng nhập vào hệ thống quản lý khách sạn
                </p>
              </div>

              <LoginForm onSuccess={handleSuccess} />
              <div className="text-end mt-2">
               <Link to="/reset-password">
                     Quên mật khẩu?
               </Link>
              </div>
              <div className="text-center mt-3">
                <span className="text-muted">
                  Chưa có tài khoản?{' '}
                </span>

                <Link to="/register">
                  Đăng ký
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
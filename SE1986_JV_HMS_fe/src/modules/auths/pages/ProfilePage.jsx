import { Link, Navigate } from 'react-router';

import { useAuth } from '../../../app/provider/AuthsContext';
import ProfileForm from '../components/ProfileForm';

export default function ProfilePage() {
  const { isAuthenticated, user } = useAuth();

  // Chưa đăng nhập thì chuyển về Login
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: '/profile' } }}
      />
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="mb-4">
                <h2 className="mb-2">Hồ sơ cá nhân</h2>

                <p className="text-muted mb-0">
                  Xem và cập nhật thông tin tài khoản của bạn.
                </p>
              </div>

              <ProfileForm />

              <div className="mt-4">
                <Link to="/rooms">
                  ← Quay lại trang phòng
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
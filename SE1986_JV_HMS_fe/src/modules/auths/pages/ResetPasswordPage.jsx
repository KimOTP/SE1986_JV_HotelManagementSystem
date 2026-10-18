import { Link } from 'react-router';

import ResetPasswordForm from '../components/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <h2 className="mb-2">Đổi mật khẩu</h2>

                <p className="text-muted mb-0">
                  Nhập email đăng nhập và mật khẩu mới
                </p>
              </div>

              <ResetPasswordForm />

              <p className="text-center mt-3 mb-0">
                <Link to="/login">
                  Quay lại đăng nhập
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
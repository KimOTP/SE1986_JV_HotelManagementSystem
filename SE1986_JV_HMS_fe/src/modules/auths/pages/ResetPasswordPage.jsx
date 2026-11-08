import { Link } from 'react-router';

// Hệ thống không gửi mail: quản trị viên đặt mật khẩu tạm cho người dùng (UC-A3).
export default function ResetPasswordPage() {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <h2 className="mb-2">Quên mật khẩu</h2>
              </div>

              <p className="mb-2">
                Vui lòng liên hệ quản trị viên để được đặt lại mật khẩu.
              </p>

              <p className="text-muted mb-0">
                Sau khi nhận mật khẩu tạm, hãy đăng nhập và đổi mật khẩu trong
                trang Hồ sơ.
              </p>

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

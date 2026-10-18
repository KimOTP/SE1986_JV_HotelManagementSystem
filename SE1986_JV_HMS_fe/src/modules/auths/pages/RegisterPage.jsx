import { Link, useNavigate } from 'react-router';

import RegisterForm from '../components/RegisterForm';

export default function RegisterPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/login', {
      replace: true,
      state: {
        message: 'Đăng ký thành công. Vui lòng đăng nhập.',
      },
    });
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-7 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <h2 className="mb-2">Đăng ký</h2>

                <p className="text-muted mb-0">
                  Tạo tài khoản khách hàng
                </p>
              </div>

              <RegisterForm onSuccess={handleSuccess} />

              <div className="text-center mt-3">
                <span className="text-muted">
                  Đã có tài khoản?{' '}
                </span>

                <Link to="/login">
                  Đăng nhập
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
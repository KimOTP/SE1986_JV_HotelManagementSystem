import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { resetPasswordSchema } from '../schemas/authSchemas';
import { authsApi } from '../api/authsApi';

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values) => {
    setSubmitError('');
    setSuccessMessage('');

    try {
      await authsApi.resetPassword({
        email: values.email,
        password: values.password,
      });

      setSuccessMessage(
        'Đổi mật khẩu thành công. Đang chuyển về trang đăng nhập...',
      );

      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (error) {
      setSubmitError(
        error?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-3">
        <label htmlFor="reset-email" className="form-label">
          Email đăng nhập
        </label>
        <input
          id="reset-email"
          type="email"
          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
          autoComplete="username"
          placeholder="name@example.com"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && (
          <div className="invalid-feedback">{errors.email.message}</div>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="reset-password" className="form-label">
          Mật khẩu mới
        </label>
        <div className="input-group">
          <input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
            autoComplete="new-password"
            placeholder="Nhập mật khẩu mới"
            {...register('password')}
            aria-invalid={Boolean(errors.password)}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? 'Ẩn' : 'Hiện'}
          </button>
        </div>
        {errors.password && (
          <div className="text-danger small mt-1" role="alert">
            {errors.password.message}
          </div>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="reset-confirm-password" className="form-label">
          Xác nhận mật khẩu mới
        </label>
        <div className="input-group">
          <input
            id="reset-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            className={`form-control ${
              errors.confirmPassword ? 'is-invalid' : ''
            }`}
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            {...register('confirmPassword')}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() =>
              setShowConfirmPassword((current) => !current)
            }
          >
            {showConfirmPassword ? 'Ẩn' : 'Hiện'}
          </button>
        </div>
        {errors.confirmPassword && (
          <div className="text-danger small mt-1" role="alert">
            {errors.confirmPassword.message}
          </div>
        )}
      </div>

      {submitError && (
        <div className="alert alert-danger" role="alert">
          {submitError}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" role="status">
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Đang xử lý...' : 'Đổi mật khẩu'}
      </button>
    </form>
  );
}

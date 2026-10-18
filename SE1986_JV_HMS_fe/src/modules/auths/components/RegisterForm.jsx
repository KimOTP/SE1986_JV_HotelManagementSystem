import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { registerSchema } from '../schemas/authSchemas';
import { authsApi } from '../api/authsApi';

export default function RegisterForm({ onSuccess }) {
  const [serverError, setServerError] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),

    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');

    try {
      const user = await authsApi.register(data);

      if (onSuccess) {
        onSuccess(user);
      }
    } catch (error) {
      setServerError(
        error?.message || 'Đăng ký thất bại. Vui lòng thử lại.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Full name */}
      <div className="mb-3">
        <label htmlFor="fullName" className="form-label">
          Họ và tên
        </label>

        <input
          id="fullName"
          type="text"
          className={`form-control ${
            errors.fullName ? 'is-invalid' : ''
          }`}
          {...register('fullName')}
        />

        {errors.fullName && (
          <div className="invalid-feedback">
            {errors.fullName.message}
          </div>
        )}
      </div>

      {/* Email */}
      <div className="mb-3">
        <label htmlFor="registerEmail" className="form-label">
          Email
        </label>

        <input
          id="registerEmail"
          type="email"
          className={`form-control ${
            errors.email ? 'is-invalid' : ''
          }`}
          {...register('email')}
        />

        {errors.email && (
          <div className="invalid-feedback">
            {errors.email.message}
          </div>
        )}
      </div>

      {/* Password */}
      <div className="mb-3">
        <label htmlFor="registerPassword" className="form-label">
          Mật khẩu
        </label>

        <div className="input-group">
          <input
            id="registerPassword"
            type={showPassword ? 'text' : 'password'}
            className={`form-control ${
              errors.password ? 'is-invalid' : ''
            }`}
            {...register('password')}
          />

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={
              showPassword
                ? 'Ẩn mật khẩu'
                : 'Hiện mật khẩu'
            }
          >
            {showPassword ? 'Ẩn' : 'Hiện'}
          </button>
        </div>

        {errors.password && (
          <div className="text-danger small mt-1">
            {errors.password.message}
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div className="mb-3">
        <label
          htmlFor="confirmPassword"
          className="form-label"
        >
          Xác nhận mật khẩu
        </label>

        <div className="input-group">
          <input
            id="confirmPassword"
            type={
              showConfirmPassword
                ? 'text'
                : 'password'
            }
            className={`form-control ${
              errors.confirmPassword
                ? 'is-invalid'
                : ''
            }`}
            {...register('confirmPassword')}
          />

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() =>
              setShowConfirmPassword(
                (current) => !current,
              )
            }
            aria-label={
              showConfirmPassword
                ? 'Ẩn mật khẩu xác nhận'
                : 'Hiện mật khẩu xác nhận'
            }
          >
            {showConfirmPassword ? 'Ẩn' : 'Hiện'}
          </button>
        </div>

        {errors.confirmPassword && (
          <div className="text-danger small mt-1">
            {errors.confirmPassword.message}
          </div>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="alert alert-danger" role="alert">
          {serverError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? 'Đang đăng ký...'
          : 'Đăng ký'}
      </button>
    </form>
  );
}
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { loginSchema } from '../schemas/authSchemas';
import { authsApi } from '../api/authsApi';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';

export default function LoginForm({ onSuccess }) {
  const { login } = useAuth();

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');

    try {
      const result = await authsApi.login(data);

      login(result);

      if (onSuccess) {
        onSuccess(result.user);
      }
    } catch (error) {
      setServerError(
        error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Email */}
      <div className="mb-3">
        <label htmlFor="email" className="form-label">
          Email
        </label>

        <input
          id="email"
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
        <label htmlFor="password" className="form-label">
          Mật khẩu
        </label>

        <div className="input-group">
          <input
            id="password"
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
        {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
}
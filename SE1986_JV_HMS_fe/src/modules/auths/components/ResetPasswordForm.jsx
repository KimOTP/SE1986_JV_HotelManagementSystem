import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { forgotPasswordSchema, resetWithOtpSchema } from '../schemas/authSchemas';
import { authsApi } from '../api/authsApi';

// Khớp OTP_RESEND_COOLDOWN_SECONDS mặc định của backend.
const RESEND_SECONDS = 60;

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [serverError, setServerError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const emailForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetWithOtpSchema),
    defaultValues: { otp: '', password: '', confirmPassword: '' },
  });

  // Đếm ngược để chặn bấm "Gửi lại mã" quá sớm (backend cũng chặn).
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const sendCode = async (targetEmail) => {
    setServerError('');
    try {
      const result = await authsApi.requestPasswordReset({ email: targetEmail });
      setEmail(targetEmail);
      setStep('code');
      setSecondsLeft(RESEND_SECONDS);
      setNotice(result?.message || 'Mã xác nhận đã được gửi. Vui lòng kiểm tra hộp thư.');
    } catch (error) {
      setServerError(error?.message || 'Không thể gửi mã. Vui lòng thử lại.');
    }
  };

  const onSubmitEmail = (data) => sendCode(data.email);

  const onSubmitReset = async (data) => {
    setServerError('');
    try {
      await authsApi.resetPasswordWithOtp({
        email,
        otp: data.otp,
        newPassword: data.password,
      });
      navigate('/login', {
        replace: true,
        state: { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' },
      });
    } catch (error) {
      setServerError(error?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    }
  };

  const changeEmail = () => {
    setStep('email');
    setNotice('');
    setServerError('');
    resetForm.reset();
  };

  if (step === 'email') {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = emailForm;

    return (
      <form onSubmit={handleSubmit(onSubmitEmail)} noValidate>
        <p className="text-muted">
          Nhập email đã đăng ký. Chúng tôi sẽ gửi một mã xác nhận 6 chữ số tới email này.
        </p>

        <div className="mb-3">
          <label htmlFor="resetEmail" className="form-label">Email</label>
          <input
            id="resetEmail"
            type="email"
            autoComplete="email"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            {...register('email')}
          />
          {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
        </div>

        {serverError && <div className="alert alert-danger" role="alert">{serverError}</div>}

        <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi mã xác nhận'}
        </button>
      </form>
    );
  }

  const { register, handleSubmit, formState: { errors, isSubmitting } } = resetForm;

  return (
    <form onSubmit={handleSubmit(onSubmitReset)} noValidate>
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <p className="text-muted">
        Nhập mã 6 chữ số gửi tới <strong>{email}</strong> và mật khẩu mới.
      </p>

      <div className="mb-3">
        <label htmlFor="resetOtp" className="form-label">Mã xác nhận</label>
        <input
          id="resetOtp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className={`form-control ${errors.otp ? 'is-invalid' : ''}`}
          {...register('otp')}
        />
        {errors.otp && <div className="invalid-feedback">{errors.otp.message}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="resetPassword" className="form-label">Mật khẩu mới</label>
        <div className="input-group">
          <input
            id="resetPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
            {...register('password')}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? 'Ẩn' : 'Hiện'}
          </button>
        </div>
        {errors.password && <div className="text-danger small mt-1">{errors.password.message}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="resetConfirmPassword" className="form-label">Xác nhận mật khẩu mới</label>
        <input
          id="resetConfirmPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <div className="invalid-feedback">{errors.confirmPassword.message}</div>
        )}
      </div>

      {serverError && <div className="alert alert-danger" role="alert">{serverError}</div>}

      <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
        {isSubmitting ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
      </button>

      <div className="d-flex justify-content-between mt-3 small">
        <button type="button" className="btn btn-link p-0" onClick={changeEmail}>
          Đổi email
        </button>
        <button
          type="button"
          className="btn btn-link p-0"
          disabled={secondsLeft > 0}
          onClick={() => sendCode(email)}
        >
          {secondsLeft > 0 ? `Gửi lại mã sau ${secondsLeft}s` : 'Gửi lại mã'}
        </button>
      </div>
    </form>
  );
}

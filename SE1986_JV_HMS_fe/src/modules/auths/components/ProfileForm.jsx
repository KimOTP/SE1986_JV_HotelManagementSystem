import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  profileSchema,
  changePasswordSchema,
} from '../schemas/authSchemas';

import { authsApi } from '../api/authsApi';
import { useAuth } from '../../../app/provider/AuthsContext';

export default function ProfileForm() {
  const { user, updateProfile } = useAuth();

  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // Form thông tin cá nhân
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: {
      errors: profileErrors,
      isSubmitting: isProfileSubmitting,
      isDirty: isProfileDirty,
    },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
    },
  });

  // Form đổi mật khẩu
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: {
      errors: passwordErrors,
      isSubmitting: isPasswordSubmitting,
    },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Đồng bộ tên khi user trong AuthContext thay đổi
  useEffect(() => {
    resetProfile({
      fullName: user?.fullName || '',
    });
  }, [user?.fullName, resetProfile]);

  // Cập nhật thông tin cá nhân
  const onUpdateProfile = async (data) => {
    setProfileError('');
    setProfileSuccess('');

    try {
      await updateProfile({
        fullName: data.fullName,
      });

      setProfileSuccess('Cập nhật thông tin cá nhân thành công.');

      resetProfile({
        fullName: data.fullName.trim(),
      });
    } catch (error) {
      setProfileError(
        error?.message || 'Không thể cập nhật thông tin cá nhân.',
      );
    }
  };

  // Đổi mật khẩu
  const onChangePassword = async (data) => {
    setPasswordError('');
    setPasswordSuccess('');

    try {
      await authsApi.changePassword({
        userId: user.id,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      resetPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setPasswordSuccess(
        'Đổi mật khẩu thành công. Lần đăng nhập tiếp theo, hãy sử dụng mật khẩu mới.',
      );
    } catch (error) {
      setPasswordError(
        error?.message || 'Không thể đổi mật khẩu.',
      );
    }
  };

  return (
    <div>
      {/* ================= PROFILE INFORMATION ================= */}
      <section className="mb-5">
        <h4 className="mb-3">Thông tin cá nhân</h4>

        {profileSuccess && (
          <div className="alert alert-success" role="status">
            {profileSuccess}
          </div>
        )}

        {profileError && (
          <div className="alert alert-danger" role="alert">
            {profileError}
          </div>
        )}

        <form onSubmit={handleProfileSubmit(onUpdateProfile)}>
          {/* Full name */}
          <div className="mb-3">
            <label htmlFor="profileFullName" className="form-label">
              Họ và tên
            </label>

            <input
              id="profileFullName"
              type="text"
              autoComplete="name"
              className={`form-control ${
                profileErrors.fullName ? 'is-invalid' : ''
              }`}
              {...registerProfile('fullName')}
            />

            {profileErrors.fullName && (
              <div className="invalid-feedback">
                {profileErrors.fullName.message}
              </div>
            )}
          </div>

          {/* Email */}
          <div className="mb-3">
            <label htmlFor="profileEmail" className="form-label">
              Email
            </label>

            <input
              id="profileEmail"
              type="email"
              className="form-control"
              value={user?.email || ''}
              readOnly
            />

            <div className="form-text">
              Email đăng nhập không thể thay đổi tại đây.
            </div>
          </div>

          {/* Role */}
          <div className="mb-3">
            <label htmlFor="profileRole" className="form-label">
              Vai trò
            </label>

            <input
              id="profileRole"
              type="text"
              className="form-control"
              value={user?.role || ''}
              readOnly
            />
          </div>

          {/* Account status */}
          <div className="mb-3">
            <label htmlFor="profileStatus" className="form-label">
              Trạng thái tài khoản
            </label>

            <input
              id="profileStatus"
              type="text"
              className="form-control"
              value={user?.enabled ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
              readOnly
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isProfileSubmitting || !isProfileDirty}
          >
            {isProfileSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </form>
      </section>

      <hr className="my-4" />

      {/* ================= CHANGE PASSWORD ================= */}
      <section>
        <h4 className="mb-2">Đổi mật khẩu</h4>

        <p className="text-muted mb-3">
          Nhập mật khẩu hiện tại và đặt mật khẩu mới cho tài khoản.
        </p>

        {passwordSuccess && (
          <div className="alert alert-success" role="status">
            {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div className="alert alert-danger" role="alert">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit(onChangePassword)}>
          {/* Current password */}
          <div className="mb-3">
            <label
              htmlFor="currentPassword"
              className="form-label"
            >
              Mật khẩu hiện tại
            </label>

            <div className="input-group">
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`form-control ${
                  passwordErrors.currentPassword ? 'is-invalid' : ''
                }`}
                {...registerPassword('currentPassword')}
              />

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() =>
                  setShowCurrentPassword((previous) => !previous)
                }
              >
                {showCurrentPassword ? 'Ẩn' : 'Hiện'}
              </button>

              {passwordErrors.currentPassword && (
                <div className="invalid-feedback">
                  {passwordErrors.currentPassword.message}
                </div>
              )}
            </div>
          </div>

          {/* New password */}
          <div className="mb-3">
            <label htmlFor="newPassword" className="form-label">
              Mật khẩu mới
            </label>

            <div className="input-group">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-control ${
                  passwordErrors.newPassword ? 'is-invalid' : ''
                }`}
                {...registerPassword('newPassword')}
              />

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() =>
                  setShowNewPassword((previous) => !previous)
                }
              >
                {showNewPassword ? 'Ẩn' : 'Hiện'}
              </button>

              {passwordErrors.newPassword && (
                <div className="invalid-feedback">
                  {passwordErrors.newPassword.message}
                </div>
              )}
            </div>
          </div>

          {/* Confirm new password */}
          <div className="mb-3">
            <label
              htmlFor="confirmPassword"
              className="form-label"
            >
              Xác nhận mật khẩu mới
            </label>

            <div className="input-group">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-control ${
                  passwordErrors.confirmPassword ? 'is-invalid' : ''
                }`}
                {...registerPassword('confirmPassword')}
              />

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
              >
                {showConfirmPassword ? 'Ẩn' : 'Hiện'}
              </button>

              {passwordErrors.confirmPassword && (
                <div className="invalid-feedback">
                  {passwordErrors.confirmPassword.message}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-outline-primary"
            disabled={isPasswordSubmitting}
          >
            {isPasswordSubmitting ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </section>
    </div>
  );
}
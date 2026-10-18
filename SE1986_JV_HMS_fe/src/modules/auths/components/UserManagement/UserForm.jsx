import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { internalUserSchema } from '../../schemas/authSchemas';

const INTERNAL_ROLES = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
];

export default function UserForm({
  selectedUser,
  actorRole,
  onSave,
  onCancel,
  isSaving = false,
}) {
  const isEditing = Boolean(selectedUser);
  const canAssignAdmin = actorRole === 'ADMIN';

  const availableRoles = canAssignAdmin
    ? [
        { value: 'ADMIN', label: 'Admin' },
        ...INTERNAL_ROLES,
      ]
    : INTERNAL_ROLES;

  const {
  register,
  handleSubmit,
  reset,
  setError,
  formState: { errors },
} = useForm({
  resolver: zodResolver(internalUserSchema),
  defaultValues: {
    fullName: '',
    email: '',
    role: 'RECEPTIONIST',
    password: '',
  },
});

  useEffect(() => {
    reset({
      fullName: selectedUser?.fullName || '',
      email: selectedUser?.email || '',
      role: selectedUser?.role || 'RECEPTIONIST',
      password: '',
    });
  }, [selectedUser, reset]);

  const submitForm = async (data) => {
  if (!isEditing && !data.password?.trim()) {
    setError('password', {
      type: 'manual',
      message: 'Vui lòng nhập mật khẩu ban đầu.',
    });
    return;
  }

  if (!isEditing && data.password.length < 6) {
    setError('password', {
      type: 'manual',
      message: 'Mật khẩu phải có ít nhất 6 ký tự.',
    });
    return;
  }

  await onSave({
    fullName: data.fullName,
    email: data.email,
    role: data.role,
    ...(isEditing ? {} : { password: data.password }),
  });
};

  return (
    <form onSubmit={handleSubmit(submitForm)}>
      <div className="mb-3">
        <label htmlFor="internalFullName" className="form-label">
          Họ và tên
        </label>

        <input
          id="internalFullName"
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

      <div className="mb-3">
        <label htmlFor="internalEmail" className="form-label">
          Email
        </label>

        <input
          id="internalEmail"
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

      <div className="mb-3">
        <label htmlFor="internalRole" className="form-label">
          Vai trò
        </label>

        <select
          id="internalRole"
          className={`form-select ${
            errors.role ? 'is-invalid' : ''
          }`}
          {...register('role')}
        >
          {availableRoles.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {errors.role && (
          <div className="invalid-feedback">
            {errors.role.message}
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="mb-3">
          <label htmlFor="internalPassword" className="form-label">
            Mật khẩu ban đầu
          </label>

          <input
            id="internalPassword"
            type="password"
            autoComplete="new-password"
            className={`form-control ${
              errors.password ? 'is-invalid' : ''
            }`}
            {...register('password')}
          />

          <div className="form-text">
            Mật khẩu phải có ít nhất 6 ký tự.
          </div>

          {errors.password && (
            <div className="invalid-feedback">
              {errors.password.message}
            </div>
          )}
        </div>
      )}

      <div className="d-flex gap-2 justify-content-end">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Hủy
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSaving}
        >
          {isSaving
            ? 'Đang lưu...'
            : isEditing
              ? 'Lưu thay đổi'
              : 'Tạo tài khoản'}
        </button>
      </div>
    </form>
  );
}
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { authsApi } from '../api/authsApi';
import UserForm from '../components/UserManagement/UserForm';
import UserList from '../components/UserManagement/UserList';

import { useAuth } from '../../../app/provider/AuthsContext.jsx';

export default function UserManagementPage() {
  const { user, role, permissions } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');
  // Mật khẩu tạm chỉ hiện một lần, không lưu lại ở đâu khác.
  const [resetResult, setResetResult] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchInternalUsers = useCallback(async () => {
    return authsApi.getUsers();
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await fetchInternalUsers());
      setPageError('');
    } catch (error) {
      setPageError(
        error?.message || 'Không thể tải danh sách tài khoản.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchInternalUsers]);

  useEffect(() => {
    let active = true;
    fetchInternalUsers()
      .then((internalUsers) => {
        if (active) {
          setUsers(internalUsers);
          setPageError('');
        }
      })
      .catch((error) => {
        if (active) {
          setPageError(error?.message || 'Không thể tải danh sách tài khoản.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [fetchInternalUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        (item.fullName || '').toLowerCase().includes(normalizedSearch) ||
        (item.email || '').toLowerCase().includes(normalizedSearch);

      const matchesRole =
        roleFilter === 'ALL' || item.role === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.enabled) ||
        (statusFilter === 'DISABLED' && !item.enabled);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const openCreateForm = () => {
    setSelectedUser(null);
    setPageError('');
    setPageSuccess('');
    setResetResult(null);
    setIsFormOpen(true);
  };

  const openEditForm = (targetUser) => {
    setSelectedUser(targetUser);
    setPageError('');
    setPageSuccess('');
    setResetResult(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setSelectedUser(null);
    setIsFormOpen(false);
  };

  const handleResetPassword = async (targetUser) => {
    const confirmed = window.confirm(
      `Đặt lại mật khẩu của ${targetUser.email}? Mật khẩu hiện tại sẽ không dùng được nữa và người này bị đăng xuất.`,
    );

    if (!confirmed) {
      return;
    }

    setPageError('');
    setPageSuccess('');
    setResetResult(null);

    try {
      const { temporaryPassword } = await authsApi.resetUserPassword({
        userId: targetUser.id,
      });

      setResetResult({ email: targetUser.email, temporaryPassword });
    } catch (error) {
      setPageError(error?.message || 'Không thể đặt lại mật khẩu.');
    }
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    setPageError('');
    setPageSuccess('');
    setResetResult(null);

    try {
      if (selectedUser) {
        await authsApi.updateInternalUser({
          actorId: user.id,
          actorPermissions: permissions,
          userId: selectedUser.id,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          jobTitle: formData.jobTitle,
        });

        setPageSuccess('Cập nhật tài khoản thành công.');
      } else {
        await authsApi.createInternalUser({
          actorPermissions: permissions,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          jobTitle: formData.jobTitle,
          password: formData.password,
        });

        setPageSuccess('Tạo tài khoản thành công.');
      }

      closeForm();
      setIsLoading(true);
      await loadUsers();
    } catch (error) {
      setPageError(
        error?.message || 'Không thể lưu tài khoản.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const nextEnabled = !targetUser.enabled;

    const confirmed = window.confirm(
      nextEnabled
        ? `Bạn muốn kích hoạt tài khoản ${targetUser.email}?`
        : `Bạn muốn vô hiệu hóa tài khoản ${targetUser.email}?`,
    );

    if (!confirmed) {
      return;
    }

    setPageError('');
    setPageSuccess('');
    setResetResult(null);

    try {
      await authsApi.setInternalUserStatus({
        actorId: user.id,
        actorPermissions: permissions,
        userId: targetUser.id,
        enabled: nextEnabled,
      });

      setPageSuccess(
        nextEnabled
          ? 'Đã kích hoạt tài khoản.'
          : 'Đã vô hiệu hóa tài khoản.',
      );

      setIsLoading(true);
      await loadUsers();
    } catch (error) {
      setPageError(
        error?.message || 'Không thể thay đổi trạng thái tài khoản.',
      );
    }
  };

  return (
    <div className="container-fluid py-4 px-3 px-lg-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Quản lý tài khoản</h2>

          <p className="text-muted mb-0">
            UC-A5 · Quản lý tài khoản và đặt lại mật khẩu khi người dùng quên.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateForm}
        >
          + Tạo tài khoản
        </button>
      </div>

      {pageSuccess && (
        <div className="alert alert-success" role="status">
          {pageSuccess}
        </div>
      )}

      {pageError && (
        <div className="alert alert-danger" role="alert">
          {pageError}
        </div>
      )}

      {resetResult && (
        <div className="alert alert-warning" role="status">
          <div className="fw-semibold mb-1">
            Mật khẩu tạm của {resetResult.email}:{' '}
            <code className="fs-6">{resetResult.temporaryPassword}</code>
          </div>
          Hãy gửi cho người dùng ngay. Mật khẩu này chỉ hiện một lần; người dùng
          nên đăng nhập và đổi lại trong trang Hồ sơ.
        </div>
      )}

      {isFormOpen && (
        <div className="card shadow-sm mb-4">
          <div className="card-body p-4">
            <h4 className="mb-3">
              {selectedUser ? 'Cập nhật tài khoản nội bộ' : 'Tạo tài khoản nội bộ'}
            </h4>

            <UserForm
              selectedUser={selectedUser}
              onSave={handleSave}
              onCancel={closeForm}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body p-3 p-lg-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Danh sách tài khoản</h5>

            <span className="badge text-bg-secondary">
              {filteredUsers.length} tài khoản
            </span>
          </div>

          {isLoading ? (
            <div className="text-center py-5">
              <div
                className="spinner-border"
                role="status"
                aria-label="Đang tải"
              />

              <p className="text-muted mt-2 mb-0">
                Đang tải danh sách tài khoản...
              </p>
            </div>
          ) : (
            <UserList
              users={filteredUsers}
              currentUserId={user.id}
              actorRole={role}
              search={search}
              onSearchChange={setSearch}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onEdit={openEditForm}
              onToggleStatus={handleToggleStatus}
              onResetPassword={handleResetPassword}
            />
          )}
        </div>
      </div>

      <div className="mt-4">
        <Link to="/profile">← Quay lại hồ sơ cá nhân</Link>
      </div>
    </div>
  );
}
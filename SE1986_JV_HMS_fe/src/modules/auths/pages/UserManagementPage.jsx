import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router';

import { authsApi } from '../api/authsApi';
import UserForm from '../components/UserManagement/UserForm';
import UserList from '../components/UserManagement/UserList';

import { useAuth } from '../../../app/provider/AuthsContext';
import { PERMISSIONS } from '../constants/authConstants';

export default function UserManagementPage() {
  const {
    user,
    role,
    isAuthenticated,
    hasPermission,
  } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const canManageUsers = hasPermission(
    PERMISSIONS.USER_MANAGE,
  );

  const loadUsers = useCallback(async () => {
    try {
      const result = await authsApi.getUsers();

      // Chỉ quản lý tài khoản nội bộ ở UC-A5
      const internalUsers = result.filter((item) =>
        ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(item.role),
      );

      setUsers(internalUsers);
      setPageError('');
    } catch (error) {
      setPageError(
        error?.message || 'Không thể tải danh sách tài khoản.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !canManageUsers) {
      return undefined;
    }

    let isCurrent = true;

    authsApi
      .getUsers()
      .then((result) => {
        if (!isCurrent) {
          return;
        }

        const internalUsers = result.filter((item) =>
          ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(item.role),
        );

        setUsers(internalUsers);
        setPageError('');
      })
      .catch((error) => {
        if (isCurrent) {
          setPageError(
            error?.message || 'Không thể tải danh sách tài khoản.',
          );
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated, canManageUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        item.fullName.toLowerCase().includes(normalizedSearch) ||
        item.email.toLowerCase().includes(normalizedSearch);

      const matchesRole =
        roleFilter === 'ALL' || item.role === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.enabled) ||
        (statusFilter === 'DISABLED' && !item.enabled);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: '/users' } }}
      />
    );
  }

  if (!canManageUsers) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          Bạn không có quyền truy cập chức năng quản lý tài khoản.
        </div>

        <Link to="/rooms">Quay lại trang phòng</Link>
      </div>
    );
  }

  const openCreateForm = () => {
    setSelectedUser(null);
    setPageError('');
    setPageSuccess('');
    setIsFormOpen(true);
  };

  const openEditForm = (targetUser) => {
    setSelectedUser(targetUser);
    setPageError('');
    setPageSuccess('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setSelectedUser(null);
    setIsFormOpen(false);
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    setPageError('');
    setPageSuccess('');

    try {
      if (selectedUser) {
        await authsApi.updateInternalUser({
          actorId: user.id,
          actorRole: role,
          userId: selectedUser.id,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
        });

        setPageSuccess('Cập nhật tài khoản thành công.');
      } else {
        await authsApi.createInternalUser({
          actorRole: role,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
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

    try {
      await authsApi.setInternalUserStatus({
        actorId: user.id,
        actorRole: role,
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
            Tạo, cập nhật và quản lý trạng thái tài khoản nội bộ.
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

      {isFormOpen && (
        <div className="card shadow-sm mb-4">
          <div className="card-body p-4">
            <h4 className="mb-3">
              {selectedUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản nội bộ'}
            </h4>

            <UserForm
              selectedUser={selectedUser}
              actorRole={role}
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
            <h5 className="mb-0">Danh sách tài khoản nội bộ</h5>

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
import { useEffect, useMemo, useState } from 'react';
import { authsApi } from '../api/authsApi';
import {
  DATABASE_PERMISSION_CODES,
  PERMISSION_CATALOG,
  ROLE_LABELS,
  ROLES,
} from '../constants/authConstants';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';

const databasePermissionLabel = (code) => {
  if (code === 'UC-A5') return 'UC-A5 · Manage Internal Users (Staff/Manager)';
  if (code === 'UC-A6') return 'UC-A6 · Manage Roles & Permissions';
  return code;
};

export default function RoleManagementPage() {
  const { permissions: actorPermissions, refreshAuthorization } = useAuth();
  const [roles, setRoles] = useState([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState(ROLES.ADMIN);
  const [permissionDrafts, setPermissionDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  useEffect(() => {
    let active = true;
    authsApi
      .getRoles()
      .then((result) => {
        if (active) {
          setRoles(result);
          setPageError('');
        }
      })
      .catch((error) => {
        if (active) {
          setPageError(error?.message || 'Không thể tải cấu hình vai trò.');
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
  }, []);

  const selectedRole = useMemo(
    () => roles.find((item) => item.code === selectedRoleCode),
    [roles, selectedRoleCode],
  );

  const selectedPermissions =
    permissionDrafts[selectedRoleCode] || selectedRole?.permissions || [];

  const togglePermission = (permission) => {
    setPermissionDrafts((current) => {
      const currentPermissions =
        current[selectedRoleCode] || selectedRole?.permissions || [];
      const nextPermissions = currentPermissions.includes(permission)
        ? currentPermissions.filter((item) => item !== permission)
        : [...currentPermissions, permission];
      return { ...current, [selectedRoleCode]: nextPermissions };
    });
    setPageSuccess('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setPageError('');
    setPageSuccess('');

    try {
      const updatedRole = await authsApi.updateRolePermissions({
        actorPermissions,
        role: selectedRoleCode,
        permissions: selectedPermissions,
      });
      setRoles((current) =>
        current.map((item) =>
          item.code === updatedRole.code ? { ...item, permissions: updatedRole.permissions } : item,
        ),
      );
      setPermissionDrafts((current) => ({
        ...current,
        [updatedRole.code]: updatedRole.permissions,
      }));
      await refreshAuthorization();
      setPageSuccess(`Đã cập nhật quyền cho vai trò ${ROLE_LABELS[selectedRoleCode]}.`);
    } catch (error) {
      setPageError(error?.message || 'Không thể cập nhật cấu hình vai trò.');
    } finally {
      setIsSaving(false);
    }
  };

  const databasePermissions = useMemo(
    () =>
      DATABASE_PERMISSION_CODES.map((code) => ({
        code,
        label: databasePermissionLabel(code),
      })),
    [],
  );

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" aria-label="Đang tải" />
        <p className="text-muted mt-2 mb-0">Đang tải vai trò và quyền...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-4">
      <div className="mb-4">
        <h2 className="mb-1">Quản lý vai trò & quyền</h2>
        <p className="text-muted mb-0">
          UC-A6 · Cấu hình quyền theo role trong database.
        </p>
      </div>

      {pageError && <div className="alert alert-danger" role="alert">{pageError}</div>}
      {pageSuccess && <div className="alert alert-success" role="status">{pageSuccess}</div>}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <label htmlFor="managedRole" className="form-label fw-semibold">
            Vai trò
          </label>
          <select
            id="managedRole"
            className="form-select"
            value={selectedRoleCode}
            onChange={(event) => setSelectedRoleCode(event.target.value)}
          >
            {roles.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedRole && (
        <>
          <section className="card shadow-sm mb-4">
            <div className="card-header fw-semibold">Quyền theo database (UC-A1 đến UC-E6)</div>
            <div className="card-body">
              <div className="row g-3">
                {databasePermissions.map(({ code, label }) => {
                  const isLockedAdminAccess =
                    selectedRoleCode === ROLES.ADMIN && code === 'UC-A6';
                  const checked = selectedPermissions.includes(code);

                  return (
                    <div className="col-12 col-md-6 col-xl-4" key={code}>
                      <label className="form-check border rounded p-3 h-100">
                        <input
                          className="form-check-input me-2"
                          type="checkbox"
                          checked={checked}
                          disabled={isLockedAdminAccess}
                          onChange={() => togglePermission(code)}
                        />
                        <span className="form-check-label">
                          <span className="d-block fw-semibold">{label}</span>
                          {isLockedAdminAccess && (
                            <span className="small text-muted">Quyền UC-A6 của ADMIN luôn được giữ.</span>
                          )}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="card shadow-sm mb-4">
            <div className="card-header fw-semibold">Quyền sử dụng chức năng</div>
            <div className="card-body">
              <div className="row g-3">
                {PERMISSION_CATALOG
                  .filter(({ code }) => code !== 'UC-A5' && code !== 'UC-A6')
                  .map(({ code, label }) => (
                    <div className="col-12 col-md-6 col-xl-4" key={code}>
                      <label className="form-check border rounded p-3 h-100">
                        <input
                          className="form-check-input me-2"
                          type="checkbox"
                          checked={selectedPermissions.includes(code)}
                          onChange={() => togglePermission(code)}
                        />
                        <span className="form-check-label">{label}</span>
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu quyền'}
          </button>
        </>
      )}
    </div>
  );
}

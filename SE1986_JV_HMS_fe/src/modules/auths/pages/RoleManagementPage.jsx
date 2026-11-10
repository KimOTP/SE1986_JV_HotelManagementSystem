import { useEffect, useMemo, useState } from 'react';
import { authsApi } from '../api/authsApi';
import { ROLE_LABELS, ROLES } from '../constants/authConstants';
import { PERMISSION_GROUPS, PERMISSION_INFO } from '../constants/permissionCatalog';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';

const permissionName = (code) => PERMISSION_INFO[code]?.name || code;

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

  const savedPermissions = useMemo(() => selectedRole?.permissions || [], [selectedRole]);
  const selectedPermissions = permissionDrafts[selectedRoleCode] || savedPermissions;
  const isAdminRole = selectedRoleCode === ROLES.ADMIN;

  // So bản nháp với bản đã lưu để người dùng thấy rõ mình sắp thêm, bỏ quyền gì.
  const addedPermissions = selectedPermissions.filter((code) => !savedPermissions.includes(code));
  const removedPermissions = savedPermissions.filter((code) => !selectedPermissions.includes(code));
  const hasChanges = addedPermissions.length > 0 || removedPermissions.length > 0;

  const updateDraft = (nextPermissions) => {
    setPermissionDrafts((current) => ({ ...current, [selectedRoleCode]: nextPermissions }));
    setPageSuccess('');
  };

  const togglePermission = (permission) => {
    updateDraft(
      selectedPermissions.includes(permission)
        ? selectedPermissions.filter((item) => item !== permission)
        : [...selectedPermissions, permission],
    );
  };

  const setGroup = (group, checked) => {
    const groupCodes = group.permissions.map((item) => item.code);
    const others = selectedPermissions.filter((code) => !groupCodes.includes(code));
    updateDraft(checked ? [...others, ...groupCodes] : others);
  };

  const discardChanges = () => {
    setPermissionDrafts((current) => {
      const next = { ...current };
      delete next[selectedRoleCode];
      return next;
    });
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
          UC-A6 · Chọn vai trò rồi tích các chức năng vai trò đó được dùng. Thay đổi có hiệu lực ngay với mọi
          tài khoản thuộc vai trò. Admin luôn có toàn quyền.
        </p>
      </div>

      {pageError && <div className="alert alert-danger" role="alert">{pageError}</div>}
      {pageSuccess && <div className="alert alert-success" role="status">{pageSuccess}</div>}

      <div className="card shadow-sm mb-4">
        <div className="card-body d-flex flex-wrap align-items-end gap-3">
          <div className="flex-grow-1">
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
          <span className="badge text-bg-secondary fs-6">
            {selectedPermissions.length}/{Object.keys(PERMISSION_INFO).length} chức năng
          </span>
        </div>
      </div>

      {selectedRole && (
        <>
          {isAdminRole && (
            <div className="alert alert-info">
              ADMIN luôn giữ đủ mọi quyền để hệ thống không mất người quản trị, nên không chỉnh được ở đây.
            </div>
          )}

          {PERMISSION_GROUPS.map((group) => {
            const groupCodes = group.permissions.map((item) => item.code);
            const checkedCount = groupCodes.filter((code) => selectedPermissions.includes(code)).length;
            const allChecked = checkedCount === groupCodes.length;

            return (
              <section className="card shadow-sm mb-4" key={group.module}>
                <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <span className="fw-semibold">
                    Module {group.module} · {group.title}
                    <span className="badge text-bg-light border ms-2">{checkedCount}/{groupCodes.length}</span>
                  </span>
                  {!isAdminRole && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setGroup(group, !allChecked)}
                    >
                      {allChecked ? 'Bỏ cả nhóm' : 'Chọn cả nhóm'}
                    </button>
                  )}
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {group.permissions.map((permission) => {
                      const checked = selectedPermissions.includes(permission.code);
                      return (
                        <div className="col-12 col-md-6 col-xl-4" key={permission.code}>
                          <label className={`form-check border rounded p-3 h-100 ${checked ? 'border-primary' : ''}`}>
                            <input
                              className="form-check-input me-2"
                              type="checkbox"
                              checked={checked}
                              disabled={isAdminRole}
                              onChange={() => togglePermission(permission.code)}
                            />
                            <span className="form-check-label">
                              <span className="d-block fw-semibold">
                                {permission.name}
                                <span className="badge text-bg-light border ms-2 fw-normal">{permission.code}</span>
                              </span>
                              <span className="d-block small">{permission.description}</span>
                              <span className="d-block small text-muted">Màn hình: {permission.screen}</span>
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}

          {hasChanges && (
            <div className="alert alert-warning">
              <div className="fw-semibold mb-1">Thay đổi chưa lưu cho {ROLE_LABELS[selectedRoleCode]}:</div>
              {addedPermissions.length > 0 && (
                <div>Thêm: {addedPermissions.map(permissionName).join(', ')}</div>
              )}
              {removedPermissions.length > 0 && (
                <div>Bỏ: {removedPermissions.map(permissionName).join(', ')}</div>
              )}
            </div>
          )}

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving || !hasChanges || isAdminRole}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu quyền'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={discardChanges}
              disabled={isSaving || !hasChanges}
            >
              Hủy thay đổi
            </button>
          </div>
        </>
      )}
    </div>
  );
}

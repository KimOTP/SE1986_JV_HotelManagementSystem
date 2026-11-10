const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER: 'Buồng phòng',
  CUSTOMER: 'Khách hàng',
};

// UC-A5 chỉ tạo/sửa/khóa tài khoản nội bộ; đặt lại mật khẩu áp dụng cho mọi tài khoản.
const EDITABLE_ROLES = ['MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER'];

export default function UserList({
  users,
  currentUserId,
  actorRole,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onEdit,
  onToggleStatus,
  onResetPassword,
}) {
  return (
    <div>
      {/* Search and filters */}
      <div className="row g-2 mb-3">
        <div className="col-12 col-lg-5">
          <input
            type="search"
            className="form-control"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Tìm người dùng"
          />
        </div>

        <div className="col-6 col-lg-3">
          <select
            className="form-select"
            value={roleFilter}
            onChange={(event) => onRoleFilterChange(event.target.value)}
            aria-label="Lọc theo vai trò"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="MANAGER">Quản lý</option>
            <option value="RECEPTIONIST">Lễ tân</option>
            <option value="HOUSEKEEPER">Buồng phòng</option>
            <option value="CUSTOMER">Khách hàng</option>
          </select>
        </div>

        <div className="col-6 col-lg-4">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="DISABLED">Đã vô hiệu hóa</option>
          </select>
        </div>
      </div>

      {/* User table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Họ và tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-muted">
                  Không tìm thấy tài khoản phù hợp.
                </td>
              </tr>
            ) : (
              users.map((item) => {
                const isSelf =
                  String(item.id) === String(currentUserId);

                const isAdminTarget = item.role === 'ADMIN';

                const canManageTarget =
                  EDITABLE_ROLES.includes(item.role);

                const canToggle =
                  !isSelf && canManageTarget;

                const canResetPassword =
                  !isSelf &&
                  (actorRole === 'ADMIN' || !isAdminTarget);

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">
                        {item.fullName}
                        {isSelf && (
                          <span className="badge text-bg-secondary ms-2">
                            Bạn
                          </span>
                        )}
                      </div>
                    </td>

                    <td>{item.email}</td>

                    <td>
                      {ROLE_LABELS[item.role] || item.role}
                      {item.jobTitle && (
                        <div className="small text-muted">{item.jobTitle}</div>
                      )}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          item.enabled
                            ? 'text-bg-success'
                            : 'text-bg-secondary'
                        }`}
                      >
                        {item.enabled
                          ? 'Đang hoạt động'
                          : 'Đã vô hiệu hóa'}
                      </span>
                    </td>

                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => onEdit(item)}
                          disabled={!canManageTarget}
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          className={`btn btn-sm ${
                            item.enabled
                              ? 'btn-outline-danger'
                              : 'btn-outline-success'
                          }`}
                          onClick={() => onToggleStatus(item)}
                          disabled={!canToggle}
                        >
                          {item.enabled ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => onResetPassword(item)}
                          disabled={!canResetPassword}
                        >
                          Đặt lại mật khẩu
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="small text-muted mb-0">
        Bạn không thể tự vô hiệu hóa hoặc đặt lại mật khẩu của chính mình; hãy
        đổi mật khẩu trong trang Hồ sơ.
      </p>
    </div>
  );
}
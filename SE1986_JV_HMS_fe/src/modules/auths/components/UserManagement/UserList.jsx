const ROLE_LABELS = {
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên',
};

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
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Nhân viên</option>
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
                  actorRole === 'ADMIN' ||
                  !isAdminTarget;

                const canToggle =
                  !isSelf && canManageTarget;

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
        Danh sách chỉ hiển thị tài khoản nội bộ. Bạn không thể tự vô hiệu hóa
        tài khoản của mình.
      </p>
    </div>
  );
}
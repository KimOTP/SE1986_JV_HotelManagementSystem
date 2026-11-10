// Tên và mô tả của 30 quyền UC để màn Vai trò & quyền dễ đọc.
// Database chỉ lưu mã (UC-A1...); mô tả ở đây phải khớp với nơi backend kiểm tra mã đó.
export const PERMISSION_GROUPS = [
  {
    module: 'A',
    title: 'Tài khoản & phân quyền',
    permissions: [
      { code: 'UC-A1', name: 'Đăng ký tài khoản', description: 'Tự tạo tài khoản khách hàng.', screen: '/register' },
      { code: 'UC-A2', name: 'Đăng nhập, đăng xuất', description: 'Dùng hệ thống bằng email và mật khẩu.', screen: '/login' },
      { code: 'UC-A3', name: 'Quên mật khẩu', description: 'Được hướng dẫn liên hệ quản trị viên để đặt lại mật khẩu.', screen: '/reset-password' },
      { code: 'UC-A4', name: 'Hồ sơ cá nhân', description: 'Xem, sửa họ tên, số điện thoại và đổi mật khẩu của chính mình.', screen: '/profile' },
      { code: 'UC-A5', name: 'Quản lý tài khoản', description: 'Tạo, sửa, khóa tài khoản nhân viên và đặt lại mật khẩu cho người dùng.', screen: '/users' },
      { code: 'UC-A6', name: 'Quản lý vai trò & quyền', description: 'Mở màn hình này và thay đổi quyền của từng vai trò.', screen: '/admin/roles' },
    ],
  },
  {
    module: 'B',
    title: 'Danh mục phòng',
    permissions: [
      { code: 'UC-B1', name: 'Quản lý loại phòng', description: 'Thêm, sửa, ẩn loại phòng, giá và ảnh.', screen: '/admin/room-types' },
      { code: 'UC-B2', name: 'Quản lý phòng', description: 'Thêm, sửa, ẩn từng phòng (số phòng, tầng).', screen: '/admin/rooms' },
      { code: 'UC-B3', name: 'Quản lý tiện nghi', description: 'Thêm, sửa, ẩn tiện nghi của phòng.', screen: '/admin/amenities' },
      { code: 'UC-B4', name: 'Tìm phòng theo ngày', description: 'Tìm loại phòng còn trống theo ngày và số khách.', screen: '/rooms' },
      { code: 'UC-B5', name: 'Xem chi tiết phòng', description: 'Xem thông tin, ảnh và tiện nghi của loại phòng.', screen: '/rooms/:id' },
      { code: 'UC-B6', name: 'Sơ đồ phòng', description: 'Xem trạng thái hiện tại của tất cả phòng.', screen: '/admin/room-map' },
    ],
  },
  {
    module: 'C',
    title: 'Đặt phòng',
    permissions: [
      { code: 'UC-C1', name: 'Tạo đặt phòng', description: 'Đặt phòng mới (trạng thái chờ thanh toán).', screen: '/bookings/new' },
      { code: 'UC-C2', name: 'Thanh toán tiền cọc', description: 'Đặt cọc để xác nhận đặt phòng.', screen: '/bookings/deposit' },
      { code: 'UC-C3', name: 'Đặt phòng của tôi', description: 'Xem lịch sử đặt phòng của chính mình.', screen: '/bookings' },
      { code: 'UC-C4', name: 'Hủy đặt phòng', description: 'Hủy đặt phòng của mình khi còn được phép.', screen: '/bookings/:id/cancel' },
      { code: 'UC-C5', name: 'Quản lý đặt phòng', description: 'Xem, lọc mọi đặt phòng và chi tiết của chúng.', screen: '/admin/bookings' },
      { code: 'UC-C6', name: 'Chi tiết đặt phòng', description: 'Xem chi tiết và dòng thời gian trạng thái của đặt phòng.', screen: '/bookings/:id' },
    ],
  },
  {
    module: 'D',
    title: 'Lễ tân & hóa đơn',
    permissions: [
      { code: 'UC-D1', name: 'Check-in', description: 'Xem khách sắp đến và làm thủ tục nhận phòng.', screen: '/frontdesk/check-in' },
      { code: 'UC-D2', name: 'Check-out & thanh toán', description: 'Làm thủ tục trả phòng và ghi nhận thanh toán hóa đơn.', screen: '/frontdesk/check-out' },
      { code: 'UC-D3', name: 'Tạo hóa đơn', description: 'Lập hóa đơn tiền phòng và dịch vụ.', screen: '/frontdesk/invoices/new' },
      { code: 'UC-D4', name: 'Xem hóa đơn', description: 'Xem danh sách và chi tiết hóa đơn.', screen: '/frontdesk/invoices' },
      { code: 'UC-D5', name: 'Sửa hóa đơn', description: 'Sửa hóa đơn chưa thanh toán.', screen: '/frontdesk/invoices/:id/edit' },
      { code: 'UC-D6', name: 'Xóa hóa đơn', description: 'Xóa và khôi phục hóa đơn.', screen: '/frontdesk/invoices' },
    ],
  },
  {
    module: 'E',
    title: 'Buồng phòng, sự cố & đánh giá',
    permissions: [
      { code: 'UC-E1', name: 'Giao việc buồng phòng', description: 'Tạo và giao việc dọn phòng, bảo trì cho nhân viên.', screen: '/operations/tasks' },
      { code: 'UC-E2', name: 'Công việc của tôi', description: 'Xem và cập nhật tiến độ việc được giao.', screen: '/operations/my-tasks' },
      { code: 'UC-E3', name: 'Tổng quan vận hành', description: 'Xem thống kê công việc và khối lượng của nhân viên.', screen: '/operations/dashboard' },
      { code: 'UC-E4', name: 'Báo cáo sự cố', description: 'Gửi báo cáo sự cố cho một phòng.', screen: '/operations/report-issue' },
      { code: 'UC-E5', name: 'Quản lý sự cố', description: 'Xem, phân công, nhận xử lý và hoàn tất sự cố.', screen: '/operations/issues' },
      { code: 'UC-E6', name: 'Đánh giá & phản hồi', description: 'Khách gửi đánh giá; quản lý xem và trả lời.', screen: '/operations/feedbacks' },
    ],
  },
];

export const PERMISSION_INFO = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => [permission.code, permission])),
);

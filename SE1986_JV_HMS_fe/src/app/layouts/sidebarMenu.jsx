export const sidebarMenu = [
  { groupLabel: 'HOUSEKEEPING', items: [
    { label: 'Tổng quan vận hành', to: '/operations/dashboard', requiredPermission: 'UC-E3' },
    { label: 'Bảng công việc', to: '/operations/tasks', requiredPermission: 'UC-E1' },
    { label: 'Công việc của tôi', to: '/operations/my-tasks', requiredPermission: 'UC-E2' },
  ] },
  { groupLabel: 'SERVICES & FEEDBACK', items: [
    { label: 'Báo cáo sự cố', to: '/operations/report-issue', requiredPermission: 'UC-E4' },
    { label: 'Quản lý sự cố', to: '/operations/issues', requiredPermission: 'UC-E5' },
    { label: 'Đánh giá của khách', to: '/operations/feedbacks', requiredPermission: 'UC-E6' },
  ] },
  { groupLabel: 'FRONT DESK', items: [
    { label: 'Check-in', to: '/frontdesk/check-in', requiredPermission: 'UC-D1' },
    { label: 'Check-out', to: '/frontdesk/check-out', requiredPermission: 'UC-D2' },
    { label: 'Hóa đơn', to: '/frontdesk/invoices', requiredPermission: 'UC-D6' },
  ] },
  { groupLabel: 'BOOKINGS', items: [
    { label: 'Tạo đặt phòng', to: '/bookings/new', requiredPermission: 'UC-C1' },
    { label: 'Đặt phòng của tôi', to: '/bookings', requiredPermission: 'UC-C3' },
    { label: 'Thanh toán tiền cọc', to: '/bookings/deposit', requiredPermission: 'UC-C2' },
    { label: 'Quản lý đặt phòng', to: '/admin/bookings', requiredPermission: 'UC-C5' },
  ] },
  { groupLabel: 'ROOM CATALOG', items: [
    { label: 'Loại phòng', to: '/admin/room-types', requiredPermission: 'UC-B1' },
    { label: 'Phòng', to: '/admin/rooms', requiredPermission: 'UC-B2' },
    { label: 'Tiện nghi', to: '/admin/amenities', requiredPermission: 'UC-B3' },
    { label: 'Sơ đồ phòng', to: '/admin/room-map', requiredPermission: 'UC-B6' },
  ] },
  { groupLabel: 'SYSTEM', items: [
    { label: 'Quản lý người dùng', to: '/users', requiredPermission: 'UC-A5' },
    { label: 'Quản lý vai trò & quyền', to: '/admin/roles', requiredPermission: 'UC-A6' },
  ] },
];

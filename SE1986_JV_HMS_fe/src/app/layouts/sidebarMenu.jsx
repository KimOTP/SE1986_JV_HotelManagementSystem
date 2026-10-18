import { PERMISSIONS } from '../../modules/auths/constants/authConstants';

export const sidebarMenu = [
  {
    groupLabel: 'DASHBOARD',
    items: [
      // { label: "Overview", to: "/dashboard" },
    ],
  },
  {
    groupLabel: 'HOUSEKEEPING',
    items: [
      {
        label: 'Tổng quan vận hành',
        to: '/operations/dashboard',
        requiredPermission: PERMISSIONS.HOUSEKEEPING_VIEW
      },
      {
        label: 'Bảng công việc',
        to: '/operations/tasks',
        requiredPermission: PERMISSIONS.HOUSEKEEPING_VIEW
      },
      {
        label: 'Công việc của tôi',
        to: '/operations/my-tasks',
        requiredPermission: PERMISSIONS.HOUSEKEEPING_VIEW
      },
    ],
  },
  {
    groupLabel: 'SERVICES & FEEDBACK',
    items: [
      {
        label: 'Báo cáo sự cố',
        to: '/operations/report-issue',
        requiredPermission: PERMISSIONS.HOUSEKEEPING_VIEW
      },
      {
        label: 'Quản lý sự cố',
        to: '/operations/issues',
        requiredPermission: PERMISSIONS.HOUSEKEEPING_VIEW // Chỉ Manager/Admin/Recep mới thấy
      },
      {
        label: 'Đánh giá của khách',
        to: '/operations/feedbacks',
        requiredPermission: PERMISSIONS.HOUSEKEEPING_MANAGE
      },
    ],
  },
  // --- DÀNH CHO CÁC BẠN KHÁC ---
  {
    groupLabel: 'FRONT DESK',
    items: [
      // permission: 'manage' (Receptionist/Manager) | 'view' (also Customer)
      { label: 'Check-in', to: '/frontdesk/check-in', permission: 'manage' },
      { label: 'Check-out', to: '/frontdesk/check-out', permission: 'manage' },
      { label: 'Hóa đơn', to: '/frontdesk/invoices', permission: 'view' },
    ],
  },
  {
    groupLabel: 'BOOKINGS',
    items: [
      { label: 'Tạo đặt phòng', to: '/bookings/new' },
      { label: 'Đặt phòng của tôi', to: '/bookings' },
      { label: 'Thanh toán tiền cọc', to: '/bookings/deposit' },
      { label: 'Quản lý đặt phòng', to: '/admin/bookings', permission: 'bookingManage' },
    ],
  },
  {
    groupLabel: 'ROOM CATALOG',
    items: [
      { label: 'Loại phòng', to: '/admin/room-types' },
      { label: 'Phòng', to: '/admin/rooms' },
      { label: 'Tiện nghi', to: '/admin/amenities' },
      { label: 'Sơ đồ phòng', to: '/admin/room-map' },
    ],
  },
  {
    groupLabel: 'SYSTEM',
    items: [
      {
        label: 'Quản lý người dùng',
        to: '/users',
        requiredPermission: PERMISSIONS.USER_MANAGE,
      },
    ],
  },
];

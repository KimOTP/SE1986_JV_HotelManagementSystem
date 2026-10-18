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
      { label: 'Operations Dashboard', to: '/operations/dashboard' },
      { label: 'Task Board', to: '/operations/tasks' },
      { label: 'My Tasks', to: '/operations/my-tasks' },
    ],
  },
  {
    groupLabel: 'SERVICES & FEEDBACK',
    items: [
      { label: 'Issue Reports', to: '/operations/issues' },
      { label: 'Guest Feedback', to: '/operations/feedbacks' },
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
      // { label: "User Management", to: "/admin/users" },
    ],
  },
];

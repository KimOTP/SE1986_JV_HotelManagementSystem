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
      // { label: "Reservations", to: "/bookings" },
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

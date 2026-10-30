import { PERMISSIONS } from '../../modules/auths/constants/authConstants';

export const sidebarMenu = [
  {
    groupLabel: 'HOUSEKEEPING',
    items: [
      {
        label: 'Operations Dashboard',
        to: '/operations/dashboard',
        requiredPermission: PERMISSIONS.OPERATIONS_VIEW,
      },
      {
        label: 'Task Board',
        to: '/operations/tasks',
        requiredPermission: PERMISSIONS.HOUSEKEEPING,
      },
      {
        label: 'My Tasks',
        to: '/operations/my-tasks',
        requiredPermission: PERMISSIONS.HOUSEKEEPING,
      },
    ],
  },
  {
    groupLabel: 'SERVICES & FEEDBACK',
    items: [
      {
        label: 'Issue Reports',
        to: '/operations/issues',
        requiredPermission: PERMISSIONS.OPERATIONS_VIEW,
      },
      {
        label: 'Guest Feedback',
        to: '/operations/feedbacks',
        requiredPermission: PERMISSIONS.OPERATIONS_VIEW,
      },
    ],
  },
  {
    groupLabel: 'FRONT DESK',
    items: [
      {
        label: 'Check-in',
        to: '/frontdesk/check-in',
        requiredPermission: PERMISSIONS.INVOICE_MANAGE,
      },
      {
        label: 'Check-out',
        to: '/frontdesk/check-out',
        requiredPermission: PERMISSIONS.INVOICE_MANAGE,
      },
      {
        label: 'Hóa đơn',
        to: '/frontdesk/invoices',
        requiredPermission: PERMISSIONS.INVOICE_VIEW,
      },
    ],
  },
  {
    groupLabel: 'BOOKINGS',
    items: [
      {
        label: 'Tạo đặt phòng',
        to: '/bookings/new',
        requiredPermission: PERMISSIONS.BOOKING_VIEW,
      },
      {
        label: 'Đặt phòng của tôi',
        to: '/bookings',
        requiredPermission: PERMISSIONS.BOOKING_VIEW,
      },
      {
        label: 'Thanh toán tiền cọc',
        to: '/bookings/deposit',
        requiredPermission: PERMISSIONS.BOOKING_VIEW,
      },
      {
        label: 'Quản lý đặt phòng',
        to: '/admin/bookings',
        requiredPermission: PERMISSIONS.BOOKING_MANAGE,
      },
    ],
  },
  {
    groupLabel: 'ROOM CATALOG',
    items: [
      {
        label: 'Loại phòng',
        to: '/admin/room-types',
        requiredPermission: PERMISSIONS.ROOM_MANAGE,
      },
      {
        label: 'Phòng',
        to: '/admin/rooms',
        requiredPermission: PERMISSIONS.ROOM_MANAGE,
      },
      {
        label: 'Tiện nghi',
        to: '/admin/amenities',
        requiredPermission: PERMISSIONS.ROOM_MANAGE,
      },
      {
        label: 'Sơ đồ phòng',
        to: '/admin/room-map',
        requiredPermission: PERMISSIONS.ROOM_MAP_VIEW,
      },
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
      {
        label: 'Quản lý vai trò & quyền',
        to: '/admin/roles',
        requiredPermission: PERMISSIONS.ROLE_MANAGE,
      },
    ],
  },
];

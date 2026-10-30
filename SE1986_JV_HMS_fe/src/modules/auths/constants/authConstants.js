export const AUTH_STORAGE_KEYS = {
  USER: 'se1986.auth.user',
  TOKEN: 'se1986.auth.token',
};

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  RECEPTIONIST: 'STAFF',
  CUSTOMER: 'CUSTOMER',
};

// UC codes are the authorization source for screens and actions. These
// descriptive aliases are retained only for existing call sites/data.
export const PERMISSIONS = {
  ROOM_VIEW: 'ROOM_VIEW',
  ROOM_MANAGE: 'ROOM_MANAGE',
  ROOM_MAP_VIEW: 'ROOM_MAP_VIEW',
  INVOICE_VIEW: 'INVOICE_VIEW',
  INVOICE_MANAGE: 'INVOICE_MANAGE',
  USER_VIEW: 'USER_VIEW',
  USER_MANAGE: 'UC-A5',
  ROLE_VIEW: 'ROLE_VIEW',
  ROLE_MANAGE: 'UC-A6',
  HOUSEKEEPING_VIEW: 'HOUSEKEEPING_VIEW',
  HOUSEKEEPING_MANAGE: 'HOUSEKEEPING_MANAGE',
  BOOKING_VIEW: 'BOOKING_VIEW',
  BOOKING_MANAGE: 'BOOKING_MANAGE',
};

export const DATABASE_PERMISSION_CODES = [...'ABCDE'].flatMap((module) =>
  Array.from({ length: 6 }, (_, index) => `UC-${module}${index + 1}`),
);

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.MANAGER]: 'Quản lý',
  [ROLES.STAFF]: 'Nhân viên',
  [ROLES.CUSTOMER]: 'Khách hàng',
};

// Defaults based on the project brief. Role permission edits are exact UC
// grants; broad legacy permissions are intentionally excluded from defaults.
// Screen and action to UC mapping. In this iteration, related view/edit
// capabilities on one screen are granted through its primary UC.
export const PERMISSION_CATALOG = [
  { code: PERMISSIONS.ROOM_VIEW, label: 'Xem danh mục phòng (legacy)' },
  { code: PERMISSIONS.ROOM_MANAGE, label: 'Quản lý phòng (legacy)' },
  { code: PERMISSIONS.ROOM_MAP_VIEW, label: 'Xem sơ đồ phòng (legacy)' },
  { code: PERMISSIONS.INVOICE_VIEW, label: 'Xem hóa đơn (legacy)' },
  { code: PERMISSIONS.INVOICE_MANAGE, label: 'Quản lý hóa đơn (legacy)' },
  { code: PERMISSIONS.USER_VIEW, label: 'Xem người dùng (legacy)' },
  { code: PERMISSIONS.USER_MANAGE, label: 'UC-A5 · Quản lý nhân viên/quản lý' },
  { code: PERMISSIONS.ROLE_VIEW, label: 'Xem vai trò và quyền (legacy)' },
  { code: PERMISSIONS.ROLE_MANAGE, label: 'UC-A6 · Quản lý vai trò và quyền' },
  { code: PERMISSIONS.HOUSEKEEPING_VIEW, label: 'Xem nghiệp vụ buồng phòng (legacy)' },
  { code: PERMISSIONS.HOUSEKEEPING_MANAGE, label: 'Quản lý buồng phòng (legacy)' },
  { code: PERMISSIONS.BOOKING_VIEW, label: 'Xem đặt phòng (legacy)' },
  { code: PERMISSIONS.BOOKING_MANAGE, label: 'Quản lý đặt phòng (legacy)' },
];

export const ROLE_PERMISSION_DEFAULTS = {
  [ROLES.ADMIN]: [...new Set([...DATABASE_PERMISSION_CODES, 'UC-C3'])],
  [ROLES.MANAGER]: [
    'UC-A2', 'UC-A3', 'UC-A4',
    'UC-B1', 'UC-B2', 'UC-B3', 'UC-B6',
    'UC-C3', 'UC-C5', 'UC-C6',
    'UC-D1', 'UC-D2', 'UC-D3', 'UC-D4', 'UC-D5', 'UC-D6',
    'UC-E1', 'UC-E3', 'UC-E5', 'UC-E6',
  ],
  [ROLES.STAFF]: [
    'UC-A2', 'UC-A3', 'UC-A4',
    'UC-B4', 'UC-B5', 'UC-B6', 'UC-C6',
    'UC-D1', 'UC-D2', 'UC-D3', 'UC-D4', 'UC-D5', 'UC-D6',
    'UC-E2', 'UC-E4', 'UC-E5',
  ],
  [ROLES.CUSTOMER]: [
    'UC-A1', 'UC-A2', 'UC-A3', 'UC-A4',
    'UC-B4', 'UC-B5',
    'UC-C1', 'UC-C2', 'UC-C3', 'UC-C4', 'UC-C6',
    'UC-D4', 'UC-E4', 'UC-E6',
  ],
};

export const INTERNAL_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF];
export const PUBLIC_ROLES = [ROLES.CUSTOMER];

export const UC_SCREEN_PERMISSIONS = {
  '/users': 'UC-A5',
  '/admin/roles': 'UC-A6',
  '/admin/room-types': 'UC-B1',
  '/admin/rooms': 'UC-B2',
  '/admin/amenities': 'UC-B3',
  '/admin/room-map': 'UC-B6',
  '/rooms': 'UC-B4',
  '/rooms/:id': 'UC-B5',
  '/bookings/new': 'UC-C1',
  '/bookings/deposit': 'UC-C2',
  '/bookings': 'UC-C3',
  '/bookings/:id/cancel': 'UC-C4',
  '/admin/bookings': 'UC-C5',
  '/bookings/:id': 'UC-C6',
  '/frontdesk/check-in': 'UC-D1',
  '/frontdesk/check-out': 'UC-D2',
  '/frontdesk/invoices/new': 'UC-D3',
  '/frontdesk/invoices/:id': 'UC-D4',
  '/frontdesk/invoices/:id/edit': 'UC-D5',
  '/frontdesk/invoices': 'UC-D6',
  '/operations/tasks': 'UC-E1',
  '/operations/my-tasks': 'UC-E2',
  '/operations/dashboard': 'UC-E3',
  '/operations/report-issue': 'UC-E4',
  '/operations/issues': 'UC-E5',
  '/operations/feedbacks': 'UC-E6',
};

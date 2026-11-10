export const AUTH_STORAGE_KEYS = {
  USER: 'se1986.auth.user',
  TOKEN: 'se1986.auth.token',
  REFRESH_TOKEN: 'se1986.auth.refreshToken',
};

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  RECEPTIONIST: 'RECEPTIONIST',
  HOUSEKEEPER: 'HOUSEKEEPER',
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
  [ROLES.RECEPTIONIST]: 'Lễ tân',
  [ROLES.HOUSEKEEPER]: 'Buồng phòng',
  [ROLES.CUSTOMER]: 'Khách hàng',
};

// Khớp bảng identity_access.role_permissions trong database seed, để chế độ mock
// hiển thị giống khi đăng nhập bằng backend (VITE_AUTH_DATA_SOURCE=api).
export const ROLE_PERMISSION_DEFAULTS = {
  [ROLES.ADMIN]: [
    'UC-A2', 'UC-A3', 'UC-A4', 'UC-A5', 'UC-A6',
    'UC-B1', 'UC-B2', 'UC-B3',
  ],
  [ROLES.MANAGER]: [
    'UC-A2', 'UC-A3', 'UC-A4',
    'UC-B4', 'UC-B5', 'UC-B6',
    'UC-C5', 'UC-C6',
    'UC-D1', 'UC-D2', 'UC-D3', 'UC-D4', 'UC-D5',
    'UC-E1', 'UC-E3', 'UC-E4', 'UC-E5', 'UC-E6',
  ],
  [ROLES.RECEPTIONIST]: [
    'UC-A2', 'UC-A3', 'UC-A4',
    'UC-B4', 'UC-B5', 'UC-B6',
    'UC-C5', 'UC-C6',
    'UC-D1', 'UC-D2', 'UC-D3', 'UC-D4',
    'UC-E4',
  ],
  [ROLES.HOUSEKEEPER]: [
    'UC-A2', 'UC-A3', 'UC-A4',
    'UC-B6',
    'UC-E2', 'UC-E4', 'UC-E5',
  ],
  [ROLES.CUSTOMER]: [
    'UC-A1', 'UC-A2', 'UC-A3', 'UC-A4',
    'UC-B4', 'UC-B5',
    'UC-C1', 'UC-C2', 'UC-C3', 'UC-C4', 'UC-C6',
    'UC-E4', 'UC-E6',
  ],
};

export const INTERNAL_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST, ROLES.HOUSEKEEPER];

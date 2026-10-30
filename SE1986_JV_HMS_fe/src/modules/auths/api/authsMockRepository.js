
import {
  DATABASE_PERMISSION_CODES,
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSION_DEFAULTS,
  ROLES,
} from '../constants/authConstants';

const USERS_STORAGE_KEY = "se1986.auth.mock.users";
const ROLE_PERMISSIONS_STORAGE_KEY = 'se1986.auth.mock.rolePermissions';

const DEFAULT_USERS = [
  {
    id: "user-admin",
    name: "Administrator",
    fullName: "Administrator",
    email: "admin@hotel.com",
    password: "123456",
    role: ROLES.ADMIN,
    enabled: true,
  },
  {
    id: "user-manager",
    name: "Hotel Manager",
    fullName: "Hotel Manager",
    email: "manager@hotel.com",
    password: "123456",
    role: ROLES.MANAGER,
    enabled: true,
  },
  {
    id: "user-receptionist",
    name: 'Nguyễn Văn A',
    fullName: 'Nguyễn Văn A',
    email: "receptionist@hotel.com",
    password: "123456",
    role: ROLES.STAFF,
    jobTitle: 'Lễ tân',
    enabled: true,
  },
  {
    id: "user-housekeeper",
    name: 'Trần Thị B',
    fullName: 'Trần Thị B',
    email: "housekeeper@hotel.com",
    password: "123456",
    role: ROLES.STAFF,
    jobTitle: 'Nhân viên buồng phòng',
    enabled: true,
  },
  {
    id: "user-customer",
    name: "Customer",
    fullName: "Customer",
    email: "customer@hotel.com",
    password: "123456",
    role: ROLES.CUSTOMER,
    enabled: true,
  },
];

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const createId = () =>
  `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getStoredUsers = () => {
  if (typeof window === "undefined") {
    return [...DEFAULT_USERS];
  }

  try {
    const storedUsers = window.localStorage.getItem(USERS_STORAGE_KEY);

    if (storedUsers) {
      const parsedUsers = JSON.parse(storedUsers);

      if (Array.isArray(parsedUsers)) {
        return parsedUsers.map((user) =>
          user.role === 'RECEPTIONIST'
            ? { ...user, role: ROLES.STAFF }
            : user,
        );
      }
    }
  } catch (error) {
    console.error("Không thể đọc danh sách tài khoản mock:", error);
  }

  window.localStorage.setItem(
    USERS_STORAGE_KEY,
    JSON.stringify(DEFAULT_USERS),
  );

  return [...DEFAULT_USERS];
};

const saveUsers = (users) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  return users;
};

const toPublicUser = (user) => {
  if (!user) return null;

  const publicUser = { ...user };
  delete publicUser.password;

  return {
    ...publicUser,
    role: user.role === 'RECEPTIONIST' ? ROLES.STAFF : user.role,
    fullName: user.fullName || user.name || '',
  };
};

const normalizeRolePermissions = (rolePermissions) => {
  const knownRoles = Object.values(ROLES).filter(
    (role, index, roles) => roles.indexOf(role) === index,
  );

  return Object.fromEntries(
    knownRoles.map((role) => {
      const stored = rolePermissions?.[role];
      if (!Array.isArray(stored)) {
        return [role, ROLE_PERMISSION_DEFAULTS[role] || []];
      }

      const permissions = new Set(
        stored.map((permission) => {
          if (permission === 'USER_MANAGE') return PERMISSIONS.USER_MANAGE;
          if (permission === 'ROLE_MANAGE') return PERMISSIONS.ROLE_MANAGE;
          return permission;
        }),
      );

      if (permissions.has('HOUSEKEEPING') || permissions.has('OPERATIONS_VIEW')) {
        permissions.add(PERMISSIONS.HOUSEKEEPING_VIEW);
      }
      if (
        permissions.has('HOUSEKEEPING') &&
        [ROLES.ADMIN, ROLES.MANAGER].includes(role)
      ) {
        permissions.add(PERMISSIONS.HOUSEKEEPING_MANAGE);
      }
      if (role !== ROLES.ADMIN) {
        permissions.delete(PERMISSIONS.USER_MANAGE);
        permissions.delete(PERMISSIONS.ROLE_MANAGE);
      }

      return [role, [...permissions]];
    }),
  );
};

const getStoredRolePermissions = () => {
  if (typeof window === 'undefined') {
    return normalizeRolePermissions(ROLE_PERMISSION_DEFAULTS);
  }

  try {
    const storedPermissions = window.localStorage.getItem(
      ROLE_PERMISSIONS_STORAGE_KEY,
    );
    if (storedPermissions) {
      return normalizeRolePermissions(JSON.parse(storedPermissions));
    }
  } catch (error) {
    console.error('Không thể đọc cấu hình quyền vai trò:', error);
  }

  const defaults = normalizeRolePermissions(ROLE_PERMISSION_DEFAULTS);
  window.localStorage.setItem(
    ROLE_PERMISSIONS_STORAGE_KEY,
    JSON.stringify(defaults),
  );
  return defaults;
};

const getEffectivePermissions = (roles = []) => {
  const rolePermissions = getStoredRolePermissions();
  return [
    ...new Set(
      roles.flatMap((role) => rolePermissions[role] || []),
    ),
  ];
};

export const authsMockRepository = {
  async getUsers() {
    return getStoredUsers().map(toPublicUser);
  },

  async getCurrentUser() {
    if (typeof window === "undefined") return null;

    try {
      const storedUser = window.localStorage.getItem(
        "se1986.auth.user",
      );

      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Không thể đọc thông tin người dùng hiện tại:", error);
      return null;
    }
  },

  async getRoles() {
    const rolePermissions = getStoredRolePermissions();
    return Object.entries(ROLE_LABELS).map(([code, name]) => ({
      code,
      name,
      permissions: rolePermissions[code] || [],
    }));
  },

  async getPermissionsForRoles(roles) {
    return getEffectivePermissions(roles);
  },

  async updateRolePermissions({ actorPermissions, role, permissions }) {
    if (!actorPermissions?.includes(PERMISSIONS.ROLE_MANAGE)) {
      throw new Error('Bạn không có UC-A6 để quản lý vai trò và quyền.');
    }
    if (!ROLE_LABELS[role]) {
      throw new Error('Vai trò không hợp lệ.');
    }
    if (!Array.isArray(permissions)) {
      throw new Error('Danh sách quyền không hợp lệ.');
    }

    const validPermissions = new Set([
      ...DATABASE_PERMISSION_CODES,
      ...Object.values(PERMISSIONS),
    ]);
    const uniquePermissions = [...new Set(permissions)];
    if (uniquePermissions.some((permission) => !validPermissions.has(permission))) {
      throw new Error('Danh sách chứa quyền không được hỗ trợ.');
    }
    if (role === ROLES.ADMIN && !uniquePermissions.includes('UC-A6')) {
      throw new Error('Không thể gỡ UC-A6 khỏi vai trò ADMIN.');
    }

    const rolePermissions = getStoredRolePermissions();
    rolePermissions[role] = uniquePermissions;
    window.localStorage.setItem(
      ROLE_PERMISSIONS_STORAGE_KEY,
      JSON.stringify(rolePermissions),
    );
    return { code: role, permissions: uniquePermissions };
  },

  async login({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const users = getStoredUsers();

    const user = users.find(
      (item) => normalizeEmail(item.email) === normalizedEmail,
    );

    if (!user || user.password !== password) {
      throw new Error("Email hoặc mật khẩu không chính xác.");
    }

    if (user.enabled === false) {
      throw new Error("Tài khoản đã bị vô hiệu hóa.");
    }

    const publicUser = toPublicUser(user);
    const roles = publicUser.roles || [publicUser.role];
    return {
      user: {
        ...publicUser,
        roles,
        permissions: getEffectivePermissions(roles),
      },
      token: `mock-token-${user.id}-${Date.now()}`,
    };
  },

  async register({ fullName, name, email, password }) {
    const normalizedFullName = (fullName || name || "").trim();

    if (!normalizedFullName) {
      throw new Error("Vui lòng nhập họ và tên.");
    }

    const normalizedEmail = normalizeEmail(email);
    const users = getStoredUsers();

    const emailExists = users.some(
      (item) => normalizeEmail(item.email) === normalizedEmail,
    );

    if (emailExists) {
      throw new Error("Email này đã được đăng ký.");
    }

    const newUser = {
      id: createId(),
      name: normalizedFullName,
      email: normalizedEmail,
      password,
      role: ROLES.CUSTOMER,
      enabled: true,
    };

    saveUsers([...users, newUser]);

    return toPublicUser(newUser);
  },

  async requestPasswordReset({ email }) {
    const normalizedEmail = normalizeEmail(email);
    const users = getStoredUsers();

    const user = users.find(
      (item) => normalizeEmail(item.email) === normalizedEmail,
    );

    if (!user || user.enabled === false) {
      throw new Error("Email không tồn tại hoặc tài khoản đã bị vô hiệu hóa.");
    }

    return {
      email: user.email,
      message: "Email hợp lệ. Bạn có thể đặt mật khẩu mới.",
    };
  },

  async resetPassword({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const users = getStoredUsers();

    const userIndex = users.findIndex(
      (item) => normalizeEmail(item.email) === normalizedEmail,
    );

    if (userIndex === -1) {
      throw new Error("Email không tồn tại trong hệ thống.");
    }

    if (users[userIndex].enabled === false) {
      throw new Error("Tài khoản đã bị vô hiệu hóa.");
    }

    const updatedUsers = users.map((user, index) =>
      index === userIndex
        ? { ...user, password }
        : user,
    );
    saveUsers(updatedUsers);

    return {
      email: normalizedEmail,
      message: "Đổi mật khẩu thành công.",
    };
  },
  async updateProfile({ userId, fullName }) {
  const users = getStoredUsers();

  const userIndex = users.findIndex(
    (item) => String(item.id) === String(userId),
  );

  if (userIndex === -1) {
    throw new Error('Không tìm thấy tài khoản.');
  }

  if (!users[userIndex].enabled) {
    throw new Error('Tài khoản đã bị vô hiệu hóa.');
  }

  const normalizedFullName = fullName.trim();

  users[userIndex] = {
    ...users[userIndex],
    fullName: normalizedFullName,
  };

  saveUsers(users);

  return toPublicUser(users[userIndex]);
  },
  async changePassword({
  userId,
  currentPassword,
  newPassword,
}) {
  const users = getStoredUsers();

  const userIndex = users.findIndex(
    (item) => String(item.id) === String(userId),
  );

  if (userIndex === -1) {
    throw new Error('Không tìm thấy tài khoản.');
  }

  const currentUser = users[userIndex];

  if (!currentUser.enabled) {
    throw new Error('Tài khoản đã bị vô hiệu hóa.');
  }

  if (currentUser.password !== currentPassword) {
    throw new Error('Mật khẩu hiện tại không chính xác.');
  }

  if (currentPassword === newPassword) {
    throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại.');
  }

  users[userIndex] = {
    ...currentUser,
    password: newPassword,
  };

  saveUsers(users);

  return { success: true };
  },
  async createInternalUser({
  actorPermissions,
  fullName,
  email,
  role,
  password,
}) {
  if (!actorPermissions?.includes(PERMISSIONS.USER_MANAGE)) {
    throw new Error('Bạn không có UC-A5 để tạo tài khoản nội bộ.');
  }
  if (![ROLES.MANAGER, ROLES.STAFF].includes(role)) {
    throw new Error('UC-A5 chỉ cho phép tạo tài khoản MANAGER hoặc STAFF.');
  }

  const users = getStoredUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const emailExists = users.some(
    (item) => item.email.trim().toLowerCase() === normalizedEmail,
  );

  if (emailExists) {
    throw new Error('Email này đã được sử dụng.');
  }

  const newUser = {
    id: `user-${Date.now()}`,
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
    role,
    enabled: true,
  };

  users.push(newUser);
  saveUsers(users);

  return toPublicUser(newUser);
  },
  async updateInternalUser({
  actorId,
  actorPermissions,
  userId,
  fullName,
  email,
  role,
}) {
  if (!actorPermissions?.includes(PERMISSIONS.USER_MANAGE)) {
    throw new Error('Bạn không có UC-A5 để cập nhật tài khoản nội bộ.');
  }

  const users = getStoredUsers();

  const userIndex = users.findIndex(
    (item) => String(item.id) === String(userId),
  );

  if (userIndex === -1) {
    throw new Error('Không tìm thấy tài khoản.');
  }

  const target = users[userIndex];

  if (![ROLES.MANAGER, ROLES.STAFF].includes(target.role)) {
    throw new Error('UC-A5 chỉ quản lý tài khoản MANAGER hoặc STAFF.');
  }
  if (![ROLES.MANAGER, ROLES.STAFF].includes(role)) {
    throw new Error('UC-A5 chỉ cho phép gán vai trò MANAGER hoặc STAFF.');
  }

  if (
    String(actorId) === String(userId) &&
    role !== target.role
  ) {
    throw new Error('Bạn không thể tự thay đổi vai trò của mình.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailExists = users.some(
    (item, index) =>
      index !== userIndex &&
      item.email.trim().toLowerCase() === normalizedEmail,
  );

  if (emailExists) {
    throw new Error('Email này đã được sử dụng.');
  }

  users[userIndex] = {
    ...target,
    fullName: fullName.trim(),
    email: normalizedEmail,
    role,
  };

  saveUsers(users);

  return toPublicUser(users[userIndex]);
  },
  async setInternalUserStatus({
  actorId,
  actorPermissions,
  userId,
  enabled,
}) {
  if (!actorPermissions?.includes(PERMISSIONS.USER_MANAGE)) {
    throw new Error('Bạn không có UC-A5 để thay đổi trạng thái tài khoản.');
  }

  if (String(actorId) === String(userId)) {
    throw new Error('Bạn không thể tự vô hiệu hóa tài khoản của mình.');
  }

  const users = getStoredUsers();

  const userIndex = users.findIndex(
    (item) => String(item.id) === String(userId),
  );

  if (userIndex === -1) {
    throw new Error('Không tìm thấy tài khoản.');
  }

  const target = users[userIndex];

  if (![ROLES.MANAGER, ROLES.STAFF].includes(target.role)) {
    throw new Error('UC-A5 chỉ quản lý tài khoản MANAGER hoặc STAFF.');
  }

  users[userIndex] = {
    ...target,
    enabled: Boolean(enabled),
  };

  saveUsers(users);

  return toPublicUser(users[userIndex]);
  },
};

export default authsMockRepository;

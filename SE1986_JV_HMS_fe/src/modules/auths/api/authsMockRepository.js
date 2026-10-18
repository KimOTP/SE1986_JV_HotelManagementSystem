
import { ROLES } from "../constants/authConstants";

const USERS_STORAGE_KEY = "se1986.auth.mock.users";

const DEFAULT_USERS = [
  {
    id: "user-admin",
    name: "Administrator",
    email: "admin@hotel.com",
    password: "123456",
    role: ROLES.ADMIN,
    enabled: true,
  },
  {
    id: "user-manager",
    name: "Hotel Manager",
    email: "manager@hotel.com",
    password: "123456",
    role: ROLES.MANAGER,
    enabled: true,
  },
  {
    id: "user-receptionist",
    name: "Receptionist",
    email: "receptionist@hotel.com",
    password: "123456",
    role: ROLES.RECEPTIONIST,
    enabled: true,
  },
  {
    id: "user-customer",
    name: "Customer",
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
        return parsedUsers;
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
    fullName: user.fullName || user.name || '',
  };
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

    return {
      user: toPublicUser(user),
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
  actorRole,
  fullName,
  email,
  role,
  password,
}) {
  if (!['ADMIN', 'MANAGER'].includes(actorRole)) {
    throw new Error('Bạn không có quyền tạo tài khoản.');
  }

  if (actorRole === 'MANAGER' && role === 'ADMIN') {
    throw new Error('MANAGER không được tạo tài khoản ADMIN.');
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
  actorRole,
  userId,
  fullName,
  email,
  role,
}) {
  if (!['ADMIN', 'MANAGER'].includes(actorRole)) {
    throw new Error('Bạn không có quyền cập nhật tài khoản.');
  }

  const users = getStoredUsers();

  const userIndex = users.findIndex(
    (item) => String(item.id) === String(userId),
  );

  if (userIndex === -1) {
    throw new Error('Không tìm thấy tài khoản.');
  }

  const target = users[userIndex];

  if (actorRole === 'MANAGER' && target.role === 'ADMIN') {
    throw new Error('MANAGER không được chỉnh sửa tài khoản ADMIN.');
  }

  if (actorRole === 'MANAGER' && role === 'ADMIN') {
    throw new Error('MANAGER không được cấp vai trò ADMIN.');
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
  actorRole,
  userId,
  enabled,
}) {
  if (!['ADMIN', 'MANAGER'].includes(actorRole)) {
    throw new Error('Bạn không có quyền thay đổi trạng thái tài khoản.');
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

  if (actorRole === 'MANAGER' && target.role === 'ADMIN') {
    throw new Error('MANAGER không được thay đổi trạng thái tài khoản ADMIN.');
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

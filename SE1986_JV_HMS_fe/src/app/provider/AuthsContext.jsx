/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  AUTH_STORAGE_KEYS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
} from '../../modules/auths/constants/authConstants';
import { authsApi } from '../../modules/auths/api/authsApi';


const AuthContext = createContext(null);

function getStoredUser() {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.USER);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
    return null;
  }
}

function getStoredToken() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  const role = user.role || user.roles?.[0] || ROLES.CUSTOMER;

  const roles = Array.isArray(user.roles) ? user.roles : [role];

  const permissions = [
    ...new Set(
      roles.flatMap(
        (currentRole) => ROLE_PERMISSIONS[currentRole] || [],
      ),
    ),
  ];

  return {
    ...user,
    role,
    roles,
    permissions,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => normalizeUser(getStoredUser()));

  const [token, setToken] = useState(() => getStoredToken());

  const login = useCallback(({ user: loggedInUser, token: authToken }) => {
    const normalizedUser = normalizeUser(loggedInUser);

    setUser(normalizedUser);
    setToken(authToken);

    localStorage.setItem(
      AUTH_STORAGE_KEYS.USER,
      JSON.stringify(normalizedUser),
    );

    localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, authToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);

    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
    localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
  }, []);

  const updateProfile = useCallback(
  async (profileData) => {
    if (!user) {
      throw new Error('Bạn chưa đăng nhập.');
    }

    const updatedUser = await authsApi.updateProfile({
      userId: user.id,
      ...profileData,
    });

    const normalizedUser = normalizeUser(updatedUser);

    setUser(normalizedUser);

    localStorage.setItem(
      AUTH_STORAGE_KEYS.USER,
      JSON.stringify(normalizedUser),
    );

    return normalizedUser;
  },
  [user],
);
  const hasRole = useCallback(
    (role) => {
      if (!user) {
        return false;
      }

      const roles = Array.isArray(user.roles) ? user.roles : [];

      return roles.includes(role);
    },
    [user],
  );

  const hasPermission = useCallback(
    (permission) => {
      if (!user) {
        return false;
      }

      const permissions = Array.isArray(user.permissions)
        ? user.permissions
        : [];

      return permissions.includes(permission);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      token,

      isAuthenticated: Boolean(user && token),

      role: user?.role || null,
      roles: user?.roles || [],
      permissions: user?.permissions || [],

      login,
      logout,
      updateProfile,

      hasRole,
      hasPermission,

      canManage: hasPermission(PERMISSIONS.ROOM_MANAGE),

      canViewMap: hasPermission(PERMISSIONS.ROOM_MAP_VIEW),

      canManageInvoices: hasPermission(PERMISSIONS.INVOICE_MANAGE),

      canViewInvoices: hasPermission(PERMISSIONS.INVOICE_VIEW),
      canManageBookings: hasRole(ROLES.ADMIN) || hasRole(ROLES.MANAGER),

      /*
       * Các permission dành cho Module A
       */
      canManageUsers: hasPermission(PERMISSIONS.USER_MANAGE),

      canManageRoles: hasPermission(PERMISSIONS.ROLE_MANAGE),
    }),
    [user, token, login, logout,updateProfile, hasRole, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider.');
  }

  return context;
}
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { roomsDataSource } from '../../modules/rooms/api/roomsApi';

const AuthContext = createContext(null);
const ROLE_KEY = 'se1986.moduleB.demoRole';
export function AuthProvider({ children }) {
  const demoEnabled = roomsDataSource === 'mock' && import.meta.env.PROD !== true;
  const [role, setRoleState] = useState(() =>
    demoEnabled ? localStorage.getItem(ROLE_KEY) || 'ADMIN' : 'GUEST',
  );
  const setRole = (next) => {
    if (demoEnabled && ['GUEST', 'ADMIN', 'MANAGER'].includes(next)) {
      localStorage.setItem(ROLE_KEY, next);
      setRoleState(next);
    }
  };
  const value = {
    role,
    setRole,
    demoEnabled,
    canManage: demoEnabled && role === 'ADMIN',
    canViewMap: demoEnabled && ['ADMIN', 'MANAGER'].includes(role),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

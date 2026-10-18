/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { roomsDataSource } from '../../modules/rooms/api/roomsApi';

const AuthContext = createContext(null);
const ROLE_KEY = 'se1986.moduleB.demoRole';
// Module D (Front Desk): staff roles can create/view/update/delete invoices; customers can only view.
const INVOICE_MANAGER_ROLES = ['RECEPTIONIST', 'MANAGER'];
const INVOICE_VIEWER_ROLES = [...INVOICE_MANAGER_ROLES, 'CUSTOMER'];
const BOOKING_MANAGER_ROLES = ['ADMIN', 'MANAGER'];
export function AuthProvider({ children }) {
  const demoEnabled = roomsDataSource === 'mock' && import.meta.env.PROD !== true;
  const [role, setRoleState] = useState(() =>
    demoEnabled ? localStorage.getItem(ROLE_KEY) || 'ADMIN' : 'GUEST',
  );
  const setRole = (next) => {
    if (demoEnabled && ['GUEST', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'CUSTOMER'].includes(next)) {
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
    canManageInvoices: demoEnabled && INVOICE_MANAGER_ROLES.includes(role),
    canViewInvoices: demoEnabled && INVOICE_VIEWER_ROLES.includes(role),
    canManageBookings: demoEnabled && BOOKING_MANAGER_ROLES.includes(role),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

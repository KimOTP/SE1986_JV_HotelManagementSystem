import { Nav } from 'react-bootstrap';
import { NavLink, useLocation } from 'react-router';
import { sidebarMenu } from '../sidebarMenu';
import { useAuth } from '../../provider/AuthsContext';
<<<<<<< Updated upstream
export default function Sidebar() {
  const auth = useAuth();
  // Items without a `permission` are visible to everyone (existing behaviour).
  const canSee = (item) =>
    !item.permission ||
    (item.permission === 'bookingManage'
      ? auth.canManageBookings
      : item.permission === 'manage'
        ? auth.canManageInvoices
        : auth.canViewInvoices);
  return (
    <aside className="app-sidebar bg-light border-end p-3">
      <Nav className="flex-column gap-1">
        {sidebarMenu
          .map((g) => ({ ...g, items: g.items.filter(canSee) }))
          .filter((g) => g.items.length)
          .map((group) => (
            <div key={group.groupLabel} className="mb-4">
              <h6 className="text-muted text-uppercase fw-bold small px-2 mb-2">
                {group.groupLabel}
              </h6>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link px-3 py-2 rounded mb-1 fw-medium ${isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
=======

const matchesPath = (pathname, to) =>
  pathname === to || pathname.startsWith(`${to}/`);

export default function Sidebar() {
  const auth = useAuth();
  const { pathname } = useLocation();

  const canSee = (item) => {
    if (item.requiredPermission) {
      return auth.hasPermission(item.requiredPermission);
    }

    if (!item.permission) {
      return true;
    }

    if (item.permission === 'bookingManage') {
      return auth.canManageBookings;
    }

    return item.permission === 'manage'
      ? auth.canManageInvoices
      : auth.canViewInvoices;
  };

  const visibleGroups = sidebarMenu
    .map((group) => ({
      ...group,
      items: group.items.filter(canSee),
    }))
    .filter((group) => group.items.length > 0);

  // Chỉ mục có đường dẫn khớp dài nhất mới được coi là đang chọn,
  // tránh trường hợp "/bookings" và "/bookings/new" cùng sáng.
  const activeItem = visibleGroups
    .flatMap((group) => group.items)
    .filter((item) => matchesPath(pathname, item.to))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <aside className="app-sidebar bg-light border-end p-3">
      <Nav className="flex-column gap-1">
        {visibleGroups.map((group) => (
          <div key={group.groupLabel} className="mb-4">
            <h6 className="text-muted text-uppercase fw-bold small px-2 mb-2">
              {group.groupLabel}
            </h6>

            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={item === activeItem ? 'page' : undefined}
                className={`nav-link px-3 py-2 rounded mb-1 fw-medium ${
                  item === activeItem
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-secondary'
                }`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
>>>>>>> Stashed changes
      </Nav>
    </aside>
  );
}

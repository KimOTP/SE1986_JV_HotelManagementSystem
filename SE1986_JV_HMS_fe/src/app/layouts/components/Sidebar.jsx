import { Nav } from 'react-bootstrap';
import { NavLink } from 'react-router';
import { sidebarMenu } from '../sidebarMenu';
import { useAuth } from '../../provider/AuthsContext';
export default function Sidebar() {
  const auth = useAuth();
  // Items without a `permission` are visible to everyone (existing behaviour).
  const canSee = (item) =>
    !item.permission ||
    (item.permission === 'manage' ? auth.canManageInvoices : auth.canViewInvoices);
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
      </Nav>
    </aside>
  );
}

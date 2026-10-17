import { Nav } from 'react-bootstrap';
import { NavLink } from 'react-router';
import { sidebarMenu } from '../sidebarMenu';
export default function Sidebar() {
  return (
    <aside className="app-sidebar bg-light border-end p-3">
      <Nav className="flex-column gap-1">
        {sidebarMenu
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

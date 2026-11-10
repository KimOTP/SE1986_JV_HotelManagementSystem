import { NavLink, useLocation } from 'react-router';
import { sidebarMenu } from '../sidebarMenu';
import { useAuth } from '../../provider/AuthsContext.jsx';
import promoImage from '../../../assets/images/hotel-promo.svg';

const matchesPath = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

export default function Sidebar({ onNavigate }) {
  const auth = useAuth();
  const { pathname } = useLocation();

  const canSee = (item) => {
    if (item.requiredRoles && !item.requiredRoles.some(auth.hasRole)) {
      return false;
    }

    if (item.requiredPermission) {
      return auth.hasPermission(item.requiredPermission);
    }

    if (!item.permission) {
      return true;
    }

    if (item.permission === 'bookingManage') {
      return auth.canManageBookings;
    }

    return item.permission === 'manage' ? auth.canManageInvoices : auth.canViewInvoices;
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
    <aside className="hms-sidebar">
      <nav className="hms-sidebar__nav" aria-label="Danh mục chức năng">
        {visibleGroups.map((group) => {
          const HeadingIcon = group.heading?.icon;

          return (
            <div
              key={group.groupLabel}
              className="hms-sidebar__section"
              aria-label={group.groupLabel}
              role="group"
            >
              {group.heading && (
                <h2 className="hms-sidebar__heading">
                  {HeadingIcon && <HeadingIcon className="hms-sidebar__icon" aria-hidden="true" />}
                  <span>{group.heading.label}</span>
                </h2>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item === activeItem;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`hms-sidebar__link${active ? ' is-active' : ''}`}
                  >
                    {Icon && <Icon className="hms-sidebar__icon" aria-hidden="true" />}
                    <span>
                      {auth.hasRole('CUSTOMER') && item.customerLabel
                        ? item.customerLabel
                        : item.label}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="hms-sidebar__promo">
        <img
          src={promoImage}
          alt="Khu nghỉ dưỡng HMS về đêm"
          className="hms-sidebar__promo-img"
          loading="lazy"
        />
      </div>
    </aside>
  );
}

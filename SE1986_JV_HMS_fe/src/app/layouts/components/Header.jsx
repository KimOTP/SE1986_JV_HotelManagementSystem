import { forwardRef } from 'react';
import { Dropdown } from 'react-bootstrap';
import {
  BoxArrowRight,
  ChevronDown,
  List,
  PersonCircle,
} from 'react-bootstrap-icons';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../provider/AuthsContext.jsx';
import logoMark from '../../../assets/images/logo-mark.svg';

function initialsOf(name, email) {
  const source = (name || email || '').trim();
  if (!source) return 'HM';

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const UserToggle = forwardRef(function UserToggle(
  { children, onClick, 'aria-expanded': ariaExpanded },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className="hms-user__toggle"
      onClick={onClick}
      aria-haspopup="menu"
      aria-expanded={ariaExpanded}
    >
      {children}
    </button>
  );
});

export default function Header({ onMenu }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.fullName || user?.name || user?.email || 'Khách';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="hms-header">
      <div className="hms-header__inner">
        <button
          type="button"
          className="hms-menu-btn d-lg-none"
          onClick={onMenu}
          aria-label="Mở danh mục"
        >
          <List />
        </button>

        <Link to="/" className="hms-brand">
          <img src={logoMark} alt="" className="hms-brand__logo" />
          <span className="hms-brand__text">Hotel Management System</span>
        </Link>

        <div className="hms-user">
          {isAuthenticated ? (
            <>
              <Dropdown align="end">
                <Dropdown.Toggle as={UserToggle} id="hms-user-menu">
                  <span className="hms-avatar" aria-hidden="true">
                    {initialsOf(user?.fullName, user?.email)}
                  </span>
                  <span className="hms-user__name d-none d-sm-inline">
                    {displayName}
                  </span>
                  <ChevronDown className="hms-user__caret" aria-hidden="true" />
                </Dropdown.Toggle>

                <Dropdown.Menu className="hms-user-menu">
                  <div className="hms-user-menu__head">
                    <div className="hms-user-menu__name">{displayName}</div>
                    {user?.email && (
                      <div className="hms-user-menu__email">{user.email}</div>
                    )}
                  </div>
                  <Dropdown.Item as={Link} to="/profile">
                    <PersonCircle aria-hidden="true" />
                    Hồ sơ cá nhân
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handleLogout}>
                    <BoxArrowRight aria-hidden="true" />
                    Đăng xuất
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <span
                className="hms-header__divider d-none d-sm-block"
                aria-hidden="true"
              />

              <button
                type="button"
                className="hms-icon-btn"
                onClick={handleLogout}
              >
                <BoxArrowRight aria-hidden="true" />
                <span className="d-none d-sm-inline">Đăng xuất</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="hms-login-btn">
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

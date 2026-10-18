import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { List } from 'react-bootstrap-icons';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../provider/AuthsContext';

export default function Header({ onMenu }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Navbar bg="dark" variant="dark" className="shadow-sm">
      <Container fluid>
        <Button
          variant="outline-light"
          className="d-md-none me-2"
          onClick={onMenu}
          aria-label="Mở menu"
        >
          <List />
        </Button>
        <Navbar.Brand as={Link} to="/" className="fw-bold">
          Hotel Management System
        </Navbar.Brand>
        <Nav className="ms-auto align-items-center flex-row gap-2">
          {isAuthenticated ? (
            <>
              <Navbar.Text className="text-light d-none d-sm-inline">
                {user?.fullName || user?.name || user?.email}
              </Navbar.Text>
              <Button
                as={Link}
                to="/profile"
                variant="outline-light"
                size="sm"
              >
                Hồ sơ
              </Button>
              <Button
                type="button"
                onClick={handleLogout}
                variant="outline-light"
                size="sm"
              >
                Đăng xuất
              </Button>
            </>
          ) : (
            <Button
              as={Link}
              to="/login"
              variant="outline-light"
              size="sm"
            >
              Đăng nhập
            </Button>
          )}
          <Button as={Link} to="/rooms" variant="outline-light" size="sm">
            Tìm phòng
          </Button>
        </Nav>
      </Container>
    </Navbar>
  );
}

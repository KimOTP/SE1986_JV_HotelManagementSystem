import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { List } from 'react-bootstrap-icons';
import { Link } from 'react-router';
import { useAuth } from '../../provider/AuthsContext';
export default function Header({ onMenu }) {
  const auth = useAuth();
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
          {auth.demoEnabled && (
            <select
              className="form-select form-select-sm"
              aria-label="Vai trò demo"
              value={auth.role}
              onChange={(e) => auth.setRole(e.target.value)}
            >
              <option value="GUEST">Guest</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          )}
          <Button as={Link} to="/rooms" variant="outline-light" size="sm">
            Tìm phòng
          </Button>
        </Nav>
      </Container>
    </Navbar>
  );
}

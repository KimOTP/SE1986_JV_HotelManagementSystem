import { Container, Nav, Navbar } from 'react-bootstrap';
import { Link, Outlet } from 'react-router';
import Footer from './components/Footer';
export default function PublicLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand as={Link} to="/rooms">
            Hotel Management System
          </Navbar.Brand>
          <Nav>
            <Nav.Link as={Link} to="/rooms">
              Tìm phòng
            </Nav.Link>
            <Nav.Link as={Link} to="/">
              Khu vực nội bộ
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>
      <main className="flex-grow-1 py-4">
        <Container>
          <Outlet />
        </Container>
      </main>
      <Footer />
    </div>
  );
}

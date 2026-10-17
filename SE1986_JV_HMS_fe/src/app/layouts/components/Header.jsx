import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { PersonCircle } from 'react-bootstrap-icons';
import { Link } from 'react-router';

const Header = () => {
  // Giả lập trạng thái đăng nhập (Tạm thời để false, khi nào có Auth của Kiên thì nối vào sau)
  const isLoggedIn = false; 
  const currentUser = { fullName: "Hoàng Minh Đức" }; // Fake user

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="fw-bold fs-5">
          Hotel Management System
        </Navbar.Brand>
        
        <Nav className="ms-auto align-items-center">
          {isLoggedIn ? (
            /* KHU VỰC DÀNH CHO NGƯỜI ĐÃ ĐĂNG NHẬP */
            <div className="d-flex align-items-center text-white gap-3">
              <div className="d-flex align-items-center gap-2">
                <PersonCircle size={24} />
                <span className="d-none d-md-inline">{currentUser.fullName}</span>
              </div>
              <Button variant="outline-light" size="sm">Đăng xuất</Button>
            </div>
          ) : (
            /* KHU VỰC DÀNH CHO NGƯỜI CHƯA ĐĂNG NHẬP */
            <div className="d-flex gap-2">
              {/* Khi nào bạn Kiên làm xong trang Login, bạn ấy sẽ sửa đường dẫn to="/login" này */}
              <Button as={Link} to="/login" variant="outline-light" size="sm">
                Đăng nhập
              </Button>
              <Button as={Link} to="/register" variant="primary" size="sm">
                Đăng ký
              </Button>
            </div>
          )}
        </Nav>
      </Container>
    </Navbar>
  );
};

export default Header;
import { Container, Row } from 'react-bootstrap';
import { useLocation } from 'react-router';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

const MainLayout = ({ children }) => {
  const location = useLocation();
  
  // Khai báo danh sách các trang KHÔNG dùng chung layout (như Login, Register)
  const noLayoutRoutes = ['/login', '/register', '/auth'];
  const isAuthPage = noLayoutRoutes.some(path => location.pathname.startsWith(path));

  // Nếu là trang Login/Register, chỉ hiển thị nội dung (children) không có Header/Sidebar
  if (isAuthPage) {
    return <div className="min-vh-100 bg-light">{children}</div>;
  }

  // Nếu là các trang bình thường, hiển thị đầy đủ Layout
  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <Container fluid className="flex-grow-1 p-0">
        <Row className="g-0">
          <Sidebar />
          <main className="col-md-10 p-4">
            {children}
          </main>
        </Row>
      </Container>
      <Footer />
    </div>
  );
};

export default MainLayout;
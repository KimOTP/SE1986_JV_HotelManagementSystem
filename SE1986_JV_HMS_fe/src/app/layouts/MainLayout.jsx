import { Container, Offcanvas } from 'react-bootstrap';
import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
export default function MainLayout({ children }) {
  const [show, setShow] = useState(false);
  return (
    <div className="d-flex flex-column min-vh-100">
      <Header onMenu={() => setShow(true)} />
      <Container fluid className="flex-grow-1 p-0 d-flex">
        <div className="d-none d-md-block">
          <Sidebar />
        </div>
        <main className="flex-grow-1 p-3 p-md-4 overflow-hidden">{children}</main>
      </Container>
      <Offcanvas show={show} onHide={() => setShow(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Điều hướng</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0" onClick={() => setShow(false)}>
          <Sidebar />
        </Offcanvas.Body>
      </Offcanvas>
      <Footer />
    </div>
  );
}

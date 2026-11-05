import { useState } from 'react';
import { Offcanvas } from 'react-bootstrap';
import { Outlet } from 'react-router';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

export default function MainLayout({ children }) {
  const [showNav, setShowNav] = useState(false);

  return (
    <div className="hms-shell">
      <Header onMenu={() => setShowNav(true)} />

      <div className="hms-body">
        <div className="hms-sidebar-col d-none d-lg-block">
          <Sidebar />
        </div>

        {/* Vùng cuộn duy nhất: nội dung trang + footer. Sidebar đứng yên. */}
        <div className="hms-scroll">
          <main className="hms-main">{children || <Outlet />}</main>
          <Footer />
        </div>
      </div>

      <Offcanvas
        show={showNav}
        onHide={() => setShowNav(false)}
        placement="start"
        className="hms-offcanvas"
      >
        <Offcanvas.Header closeButton className="hms-offcanvas__head">
          <Offcanvas.Title className="hms-offcanvas__title">
            Danh mục
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <Sidebar onNavigate={() => setShowNav(false)} />
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}

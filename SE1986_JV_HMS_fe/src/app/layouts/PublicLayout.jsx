import { Container } from 'react-bootstrap';
import { Outlet } from 'react-router';
import Header from './components/Header';
import Footer from './components/Footer';

export default function PublicLayout() {
  return (
    <div className="hms-shell">
      <Header />
      <div className="hms-scroll">
        <main className="hms-main">
          <Container className="px-0">
            <Outlet />
          </Container>
        </main>
        <Footer />
      </div>
    </div>
  );
}

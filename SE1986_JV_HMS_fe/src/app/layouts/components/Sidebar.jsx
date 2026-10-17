import { Nav, Col } from 'react-bootstrap';
import { NavLink } from 'react-router';
import { sidebarMenu } from '../sidebarMenu';

const Sidebar = () => {
  return (
    <Col md={2} className="bg-light border-end p-3 min-vh-100">
      <Nav className="flex-column gap-1">
        {sidebarMenu.map((group, index) => {
          // Ẩn nhóm nếu không có item nào
          if (group.items.length === 0) return null;

          return (
            <div key={index} className="mb-4">
              <h6 className="text-muted text-uppercase fw-bold small px-2 mb-2" style={{ letterSpacing: '0.5px' }}>
                {group.groupLabel}
              </h6>
              {group.items.map((item, idx) => (
                <Nav.Link 
                  key={idx} 
                  as={NavLink} 
                  to={item.to}
                  className={({ isActive }) => 
                    `px-3 py-2 rounded mb-1 fw-medium ${
                      isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary'
                    }`
                  }
                  // Thêm hiệu ứng hover (nếu chưa có sẵn)
                  style={({ isActive }) => ({
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? '' : 'transparent'
                  })}
                >
                  {item.label}
                </Nav.Link>
              ))}
            </div>
          );
        })}
      </Nav>
    </Col>
  );
};

export default Sidebar;
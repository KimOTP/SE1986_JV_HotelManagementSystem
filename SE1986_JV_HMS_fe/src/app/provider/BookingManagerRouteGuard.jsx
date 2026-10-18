import { Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router';
import { useAuth } from './AuthsContext';

export default function BookingManagerRouteGuard({ children }) {
  const { canManageBookings } = useAuth();
  if (canManageBookings) return children;
  return (
    <Alert variant="danger">
      <Alert.Heading>Không có quyền truy cập</Alert.Heading>
      <p>Trang quản lý đặt phòng chỉ dành cho Admin hoặc Manager.</p>
      <Button as={Link} to="/bookings">
        Về đặt phòng của tôi
      </Button>
    </Alert>
  );
}

import { Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router';
import { useAuth } from './AuthsContext';
export default function RoomRouteGuard({ mapOnly = false, children }) {
  const auth = useAuth();
  const allowed = mapOnly ? auth.canViewMap : auth.canManage;
  if (allowed) return children;
  return (
    <Alert variant="danger">
      <Alert.Heading>Không có quyền truy cập</Alert.Heading>
      <p>
        Trang này yêu cầu vai trò {mapOnly ? 'Admin hoặc Manager' : 'Admin'}. Bộ chọn quyền demo chỉ
        hoạt động trong mock/development.
      </p>
      <Button as={Link} to="/rooms">
        Về trang tìm phòng
      </Button>
    </Alert>
  );
}

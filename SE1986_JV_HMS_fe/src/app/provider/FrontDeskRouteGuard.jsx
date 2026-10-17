import { Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router';
import { useAuth } from './AuthsContext';

// Guards Front Desk (Module D) routes.
// permission="manage": Receptionist / Manager. permission="view": Receptionist / Manager / Customer.
export default function FrontDeskRouteGuard({ permission = 'manage', children }) {
  const auth = useAuth();
  const allowed = permission === 'view' ? auth.canViewInvoices : auth.canManageInvoices;
  if (allowed) return children;
  return (
    <Alert variant="danger">
      <Alert.Heading>Không có quyền truy cập</Alert.Heading>
      <p>
        {permission === 'view'
          ? 'Trang này yêu cầu vai trò Receptionist, Manager hoặc Customer.'
          : 'Trang này chỉ dành cho Receptionist hoặc Manager.'}{' '}
        Bộ chọn quyền demo chỉ hoạt động trong mock/development.
      </p>
      <Button as={Link} to="/">
        Về trang chủ
      </Button>
    </Alert>
  );
}

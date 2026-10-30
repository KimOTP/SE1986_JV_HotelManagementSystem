import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import MainLayout from './app/layouts/MainLayout';
import PublicLayout from './app/layouts/PublicLayout';
import ProtectedRoute from './app/provider/ProtectedRoute';
import { useAuth } from './app/provider/AuthsContext.jsx';
import { PERMISSIONS, ROLES } from './modules/auths/constants/authConstants';
import HousekeepingTaskBoard from './modules/operations/pages/HousekeepingTaskBoard';
import MyTasks from './modules/operations/pages/MyTasks';
import HousekeepingDashboard from './modules/operations/pages/HousekeepingDashboard';
import ReportIssueForm from './modules/operations/pages/ReportIssueForm';
import IssueManagementBoard from './modules/operations/pages/IssueManagementBoard';
import FeedbackManagement from './modules/operations/pages/FeedbackManagement';
import RoomTypeListPage from './modules/rooms/pages/RoomTypeListPage';
import RoomListPage from './modules/rooms/pages/RoomListPage';
import AmenityManagementPage from './modules/rooms/pages/AmenityManagementPage';
import RoomMapPage from './modules/rooms/pages/RoomMapPage';
import RoomSearchPage from './modules/rooms/pages/RoomSearchPage';
import RoomDetailPage from './modules/rooms/pages/RoomDetailPage';
import CheckInPage from './modules/frontdesk/pages/CheckInPage';
import CheckOutPage from './modules/frontdesk/pages/CheckOutPage';
import InvoiceListPage from './modules/frontdesk/pages/InvoiceListPage';
import InvoiceDetailPage from './modules/frontdesk/pages/InvoiceDetailPage';
import InvoiceEditPage from './modules/frontdesk/pages/InvoiceEditPage';
import InvoiceCreatePage from './modules/frontdesk/pages/InvoiceCreatePage';
import LoginPage from './modules/auths/pages/LoginPage';
import RegisterPage from './modules/auths/pages/RegisterPage';
import ResetPasswordPage from './modules/auths/pages/ResetPasswordPage';
import ProfilePage from './modules/auths/pages/ProfilePage';
import UserManagementPage from './modules/auths/pages/UserManagementPage';
import RoleManagementPage from './modules/auths/pages/RoleManagementPage';
import {
  BookingHandoffPage,
  BookingDetailPage,
  BookingHistoryPage,
  CancelBookingPage,
  CreateBookingPage,
  DepositPaymentPage,
  ManageBookingsPage,
} from './modules/bookings/pages/BookingPages';

function RoleHomeRedirect() {
  const { role } = useAuth();
  const destinations = {
    [ROLES.ADMIN]: '/users',
    [ROLES.MANAGER]: '/bookings',
    [ROLES.STAFF]: '/operations/my-tasks',
    [ROLES.CUSTOMER]: '/bookings',
  };
  return <Navigate to={destinations[role] || '/profile'} replace />;
}

function NotFound() {
  const location = useLocation();

  return (
    <div className="text-center py-5">
      <h1>404</h1>
      <p>Không tìm thấy trang: {location.pathname}</p>
    </div>
  );
}

function PermissionRoute({ permission, children }) {
  return (
    <ProtectedRoute requiredPermission={permission}>
      {children}
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/rooms" element={<PublicLayout />}>
          <Route index element={<RoomSearchPage />} />
          <Route path="booking-handoff" element={<BookingHandoffPage />} />
          <Route path=":id" element={<RoomDetailPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleHomeRedirect />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="users"
            element={
              <PermissionRoute permission={PERMISSIONS.USER_MANAGE}>
                <UserManagementPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/roles"
            element={
              <PermissionRoute permission={PERMISSIONS.ROLE_MANAGE}>
                <RoleManagementPage />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/tasks"
            element={
              <PermissionRoute permission={PERMISSIONS.HOUSEKEEPING}>
                <HousekeepingTaskBoard />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/my-tasks"
            element={
              <PermissionRoute permission={PERMISSIONS.HOUSEKEEPING}>
                <MyTasks />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/dashboard"
            element={
              <PermissionRoute permission={PERMISSIONS.OPERATIONS_VIEW}>
                <HousekeepingDashboard />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/report-issue"
            element={
              <PermissionRoute permission={PERMISSIONS.OPERATIONS_VIEW}>
                <ReportIssueForm />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/issues"
            element={
              <PermissionRoute permission={PERMISSIONS.OPERATIONS_VIEW}>
                <IssueManagementBoard />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/feedbacks"
            element={
              <PermissionRoute permission={PERMISSIONS.OPERATIONS_VIEW}>
                <FeedbackManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/room-types"
            element={
              <PermissionRoute permission={PERMISSIONS.ROOM_MANAGE}>
                <RoomTypeListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/rooms"
            element={
              <PermissionRoute permission={PERMISSIONS.ROOM_MANAGE}>
                <RoomListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/amenities"
            element={
              <PermissionRoute permission={PERMISSIONS.ROOM_MANAGE}>
                <AmenityManagementPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/room-map"
            element={
              <PermissionRoute permission={PERMISSIONS.ROOM_MAP_VIEW}>
                <RoomMapPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings/new"
            element={
              <PermissionRoute permission={PERMISSIONS.BOOKING_VIEW}>
                <CreateBookingPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings/deposit"
            element={
              <PermissionRoute permission={PERMISSIONS.BOOKING_VIEW}>
                <DepositPaymentPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings"
            element={
              <PermissionRoute permission={PERMISSIONS.BOOKING_VIEW}>
                <BookingHistoryPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings/:id/cancel"
            element={
              <PermissionRoute permission={PERMISSIONS.BOOKING_VIEW}>
                <CancelBookingPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings/:id"
            element={
              <PermissionRoute permission={PERMISSIONS.BOOKING_VIEW}>
                <BookingDetailPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/bookings"
            element={
              <PermissionRoute permission={PERMISSIONS.BOOKING_MANAGE}>
                <ManageBookingsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/check-in"
            element={
              <PermissionRoute permission={PERMISSIONS.INVOICE_MANAGE}>
                <CheckInPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/check-out"
            element={
              <PermissionRoute permission={PERMISSIONS.INVOICE_MANAGE}>
                <CheckOutPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/invoices"
            element={
              <PermissionRoute permission={PERMISSIONS.INVOICE_VIEW}>
                <InvoiceListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/invoices/new"
            element={
              <PermissionRoute permission={PERMISSIONS.INVOICE_MANAGE}>
                <InvoiceCreatePage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/invoices/:id/edit"
            element={
              <PermissionRoute permission={PERMISSIONS.INVOICE_MANAGE}>
                <InvoiceEditPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/invoices/:id"
            element={
              <PermissionRoute permission={PERMISSIONS.INVOICE_VIEW}>
                <InvoiceDetailPage />
              </PermissionRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

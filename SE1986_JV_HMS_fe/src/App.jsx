import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import MainLayout from './app/layouts/MainLayout';
import PublicLayout from './app/layouts/PublicLayout';
import ProtectedRoute from './app/provider/ProtectedRoute';
import { useAuth } from './app/provider/AuthsContext.jsx';
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
  const { hasPermission } = useAuth();
  const destinations = [
    ['/users', 'UC-A5'],
    ['/bookings', 'UC-C3'],
    ['/operations/my-tasks', 'UC-E2'],
    ['/rooms', 'UC-B4'],
    ['/profile', 'UC-A4'],
  ];
  return <Navigate to={destinations.find(([, permission]) => hasPermission(permission))?.[0] || '/profile'} replace />;
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

function PublicPermission({ permission, children }) {
  const { isAuthenticated, hasPermission } = useAuth();
  if (!isAuthenticated || hasPermission(permission)) return children;
  return <div className="container py-5"><div className="alert alert-danger">403 · Vai trò hiện tại không có quyền mở màn hình này.</div></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/403" element={<div className="container py-5"><div className="alert alert-danger">403 · Vai trò hiện tại không có quyền mở màn hình này.</div></div>} />
        <Route path="/rooms" element={<PublicLayout />}>
          <Route index element={<PublicPermission permission="UC-B4"><RoomSearchPage /></PublicPermission>} />
          <Route path="booking-handoff" element={<PublicPermission permission="UC-B4"><BookingHandoffPage /></PublicPermission>} />
          <Route path=":id" element={<PublicPermission permission="UC-B5"><RoomDetailPage /></PublicPermission>} />
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
              <PermissionRoute permission="UC-A5">
                <UserManagementPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/roles"
            element={
              <PermissionRoute permission="UC-A6">
                <RoleManagementPage />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/tasks"
            element={
              <PermissionRoute permission="UC-E1">
                <HousekeepingTaskBoard />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/my-tasks"
            element={
              <PermissionRoute permission="UC-E2">
                <MyTasks />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/dashboard"
            element={
              <PermissionRoute permission="UC-E3">
                <HousekeepingDashboard />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/report-issue"
            element={
              <PermissionRoute permission="UC-E4">
                <ReportIssueForm />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/issues"
            element={
              <PermissionRoute permission="UC-E5">
                <IssueManagementBoard />
              </PermissionRoute>
            }
          />
          <Route
            path="operations/feedbacks"
            element={
              <PermissionRoute permission="UC-E6">
                <FeedbackManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/room-types"
            element={
              <PermissionRoute permission="UC-B1">
                <RoomTypeListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/rooms"
            element={
              <PermissionRoute permission="UC-B2">
                <RoomListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/amenities"
            element={
              <PermissionRoute permission="UC-B3">
                <AmenityManagementPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/room-map"
            element={
              <PermissionRoute permission="UC-B6">
                <RoomMapPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings/new"
            element={
              <PermissionRoute permission="UC-C1">
                <CreateBookingPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings/deposit"
            element={
              <PermissionRoute permission="UC-C2">
                <DepositPaymentPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings"
            element={
              <PermissionRoute permission="UC-C3">
                <BookingHistoryPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings/:id/cancel"
            element={
              <PermissionRoute permission="UC-C4">
                <CancelBookingPage />
              </PermissionRoute>
            }
          />
          <Route
            path="bookings/:id"
            element={
              <PermissionRoute permission="UC-C6">
                <BookingDetailPage />
              </PermissionRoute>
            }
          />
          <Route
            path="admin/bookings"
            element={
              <PermissionRoute permission="UC-C5">
                <ManageBookingsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/check-in"
            element={
              <PermissionRoute permission="UC-D1">
                <CheckInPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/check-out"
            element={
              <PermissionRoute permission="UC-D2">
                <CheckOutPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/invoices"
            element={
              <PermissionRoute permission="UC-D6">
                <InvoiceListPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/invoices/new"
            element={
              <PermissionRoute permission="UC-D3">
                <InvoiceCreatePage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/invoices/:id/edit"
            element={
              <PermissionRoute permission="UC-D5">
                <InvoiceEditPage />
              </PermissionRoute>
            }
          />
          <Route
            path="frontdesk/invoices/:id"
            element={
              <PermissionRoute permission="UC-D4">
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

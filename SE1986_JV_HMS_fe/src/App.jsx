import { BrowserRouter, Route, Routes } from 'react-router';
import MainLayout from './app/layouts/MainLayout';
import PublicLayout from './app/layouts/PublicLayout';
import RoomRouteGuard from './app/provider/RoomRouteGuard';
import FrontDeskRouteGuard from './app/provider/FrontDeskRouteGuard';
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
import BookingManagerRouteGuard from './app/provider/BookingManagerRouteGuard';
import {
  BookingHandoffPage,
  BookingDetailPage,
  BookingHistoryPage,
  CancelBookingPage,
  CreateBookingPage,
  DepositPaymentPage,
  ManageBookingsPage,
} from './modules/bookings/pages/BookingPages';
const Internal = ({ children }) => <MainLayout>{children}</MainLayout>;
const Guard = ({ children, mapOnly = false }) => (
  <RoomRouteGuard mapOnly={mapOnly}>{children}</RoomRouteGuard>
);
function NotFound() {
  return (
    <div className="text-center py-5">
      <h1>404</h1>
      <p>Không tìm thấy trang.</p>
    </div>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/rooms" element={<PublicLayout />}>
          <Route index element={<RoomSearchPage />} />
          <Route path="booking-handoff" element={<BookingHandoffPage />} />
          <Route path=":id" element={<RoomDetailPage />} />
        </Route>
        <Route
          path="/"
          element={
            <Internal>
              <HousekeepingTaskBoard />
            </Internal>
          }
        />
        <Route
          path="/operations/tasks"
          element={
            <Internal>
              <HousekeepingTaskBoard />
            </Internal>
          }
        />
        <Route
          path="/operations/my-tasks"
          element={
            <Internal>
              <MyTasks />
            </Internal>
          }
        />
        <Route
          path="/operations/dashboard"
          element={
            <Internal>
              <HousekeepingDashboard />
            </Internal>
          }
        />
        <Route
          path="/operations/report-issue"
          element={
            <Internal>
              <ReportIssueForm />
            </Internal>
          }
        />
        <Route
          path="/operations/issues"
          element={
            <Internal>
              <IssueManagementBoard />
            </Internal>
          }
        />
        <Route
          path="/operations/feedbacks"
          element={
            <Internal>
              <FeedbackManagement />
            </Internal>
          }
        />
        <Route
          path="/admin/room-types"
          element={
            <Internal>
              <Guard>
                <RoomTypeListPage />
              </Guard>
            </Internal>
          }
        />
        <Route
          path="/admin/rooms"
          element={
            <Internal>
              <Guard>
                <RoomListPage />
              </Guard>
            </Internal>
          }
        />
        <Route
          path="/admin/amenities"
          element={
            <Internal>
              <Guard>
                <AmenityManagementPage />
              </Guard>
            </Internal>
          }
        />
        <Route
          path="/admin/room-map"
          element={
            <Internal>
              <Guard mapOnly>
                <RoomMapPage />
              </Guard>
            </Internal>
          }
        />
        <Route
          path="/bookings/new"
          element={
            <Internal>
              <CreateBookingPage />
            </Internal>
          }
        />
        <Route
          path="/bookings/deposit"
          element={
            <Internal>
              <DepositPaymentPage />
            </Internal>
          }
        />
        <Route
          path="/bookings"
          element={
            <Internal>
              <BookingHistoryPage />
            </Internal>
          }
        />
        <Route
          path="/bookings/:id/cancel"
          element={
            <Internal>
              <CancelBookingPage />
            </Internal>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <Internal>
              <BookingDetailPage />
            </Internal>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <Internal>
              <BookingManagerRouteGuard>
                <ManageBookingsPage />
              </BookingManagerRouteGuard>
            </Internal>
          }
        />
        {[
          // permission: 'manage' = Receptionist/Manager, 'view' = + Customer (read-only)
          ['/frontdesk/check-in', <CheckInPage />, 'manage'],
          ['/frontdesk/check-out', <CheckOutPage />, 'manage'],
          ['/frontdesk/invoices', <InvoiceListPage />, 'view'],
          ['/frontdesk/invoices/new', <InvoiceCreatePage />, 'manage'],
          ['/frontdesk/invoices/:id', <InvoiceDetailPage />, 'view'],
          ['/frontdesk/invoices/:id/edit', <InvoiceEditPage />, 'manage'],
        ].map(([path, page, permission]) => (
          <Route
            key={path}
            path={path}
            element={
              <Internal>
                <FrontDeskRouteGuard permission={permission}>{page}</FrontDeskRouteGuard>
              </Internal>
            }
          />
        ))}
        <Route
          path="*"
          element={
            <Internal>
              <NotFound />
            </Internal>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

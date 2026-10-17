import { BrowserRouter, Route, Routes } from 'react-router';
import MainLayout from './app/layouts/MainLayout';
import PublicLayout from './app/layouts/PublicLayout';
import RoomRouteGuard from './app/provider/RoomRouteGuard';
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
import BookingHandoffPage from './modules/rooms/pages/BookingHandoffPage';
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

import { BrowserRouter, Routes, Route } from 'react-router';
import MainLayout from './app/layouts/MainLayout';

// Import các pages
import HousekeepingTaskBoard from './modules/operations/pages/HousekeepingTaskBoard';
import MyTasks from './modules/operations/pages/MyTasks';
import HousekeepingDashboard from './modules/operations/pages/HousekeepingDashboard';
import ReportIssueForm from './modules/operations/pages/ReportIssueForm';
import IssueManagementBoard from './modules/operations/pages/IssueManagementBoard';
import FeedbackManagement from './modules/operations/pages/FeedbackManagement';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HousekeepingTaskBoard />} />

          {/* === ROUTE MODULE E === */}
          <Route path="/operations/tasks" element={<HousekeepingTaskBoard />} />
          <Route path="/operations/my-tasks" element={<MyTasks />} />
          
          <Route path="/operations/dashboard" element={<HousekeepingDashboard />} />
          
          <Route path="/operations/report-issue" element={<ReportIssueForm />} />
          <Route path="/operations/issues" element={<IssueManagementBoard />} />
          <Route path="/operations/feedbacks" element={<FeedbackManagement />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
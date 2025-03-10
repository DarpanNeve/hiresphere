import { Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Interview from "./pages/Interview";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import HRDashboard from "./pages/HR/Dashboard";
import CandidateManagement from "./pages/HR/CandidateManagement";
import InterviewLinks from "./pages/HR/InterviewLinks";
import Reports from "./pages/HR/Reports";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminHRManagement from "./pages/Admin/HRManagement";
import AdminSubscriptions from "./pages/Admin/Subscriptions";
import AdminSettings from "./pages/Admin/Settings";
import MySubscription from "./pages/Admin/MySubscription";
import PublicInterview from "./pages/PublicInterview";

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          {/* Protected candidate routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="interview" element={<Interview />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>

          {/* HR routes */}
          <Route element={<ProtectedRoute requiredRole="hr" />}>
            <Route path="hr/dashboard" element={<HRDashboard />} />
            <Route path="hr/candidates" element={<CandidateManagement />} />
            <Route path="hr/interview-links" element={<InterviewLinks />} />
            <Route path="hr/reports" element={<Reports />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="admin/dashboard" element={<AdminDashboard />} />
            <Route path="admin/hr-management" element={<AdminHRManagement />} />
            <Route
              path="admin/subscriptions"
              element={<AdminSubscriptions />}
            />
            <Route path="admin/settings" element={<AdminSettings />} />
            <Route path="admin/my-subscription" element={<MySubscription />} />
          </Route>
        </Route>

        {/* Public interview link (no layout) */}
        <Route path="/i/:linkId" element={<PublicInterview />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

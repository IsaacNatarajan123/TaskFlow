import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import LogTime from "./pages/LogTime";
import MyTasks from "./pages/MyTasks";
import Submissions from "./pages/Submissions";
import Approvals from "./pages/Approvals";
import Reports from "./pages/Reports";
import ManageClients from "./pages/ManageClients";
import ManageDepartments from "./pages/ManageDepartments";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/log-time" element={<LogTime />} />
        <Route path="/my-tasks" element={<MyTasks />} />      
        <Route path="/submissions" element={<Submissions />} />
        <Route path="/approvals" element={
          <ProtectedRoute requireManager>
            <Approvals />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute requireDirector>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/manage-clients" element={
          <ProtectedRoute requireDirector>
            <ManageClients />
          </ProtectedRoute>
        } />
        <Route path="/clients" element={
          <ProtectedRoute requireDirector>
            <ManageClients />
          </ProtectedRoute>
        } />
        <Route path="/manage-departments" element={
          <ProtectedRoute requireDirector>
            <ManageDepartments />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Unauthorized from './pages/Unauthorized';
import DashboardOverview from './pages/DashboardOverview';
import SchoolManagement from './pages/SchoolManagement';
import AddSchool from './pages/AddSchool';
import SchoolDetail from './pages/SchoolDetail';
import CreatePlanner from './pages/CreatePlanner';
import AllPlanners from './pages/AllPlanners';
import SchoolPortal from './pages/SchoolPortal';
import TeacherDashboard from './pages/TeacherDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '14px', borderRadius: '12px' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected routes — ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route path="/schools" element={<SchoolManagement />} />
            <Route path="/schools/add" element={<AddSchool />} />
            <Route path="/schools/:id" element={<SchoolDetail />} />
            <Route path="/planners" element={<AllPlanners />} />
            <Route path="/planners/create" element={<CreatePlanner />} />
            {/* Legacy route redirect */}
            <Route path="/super-admin-dashboard" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Protected routes — SCHOOL_ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['SCHOOL_ADMIN']} />}>
            <Route path="/school-dashboard" element={<SchoolPortal />} />
          </Route>

          {/* Protected routes — TEACHER */}
          <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          </Route>

          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

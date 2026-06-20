import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import TenantProtectedRoute from './routes/TenantProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Unauthorized from './pages/Unauthorized';
import DashboardOverview from './pages/DashboardOverview';
import SchoolManagement from './pages/SchoolManagement';
import AddSchool from './pages/AddSchool';
import SchoolDetail from './pages/SchoolDetail';
import CreatePlanner from './pages/CreatePlanner';
import AllPlanners from './pages/AllPlanners';
import ViewPlanner from './pages/ViewPlanner';
import CMSManagement from './pages/CMSManagement';
import AssessmentManagement from './pages/AssessmentManagement';
import SchoolPortal from './pages/SchoolPortal';
import TeacherDashboard from './pages/TeacherDashboard';
import CampusDashboard from './pages/CampusDashboard';
import SchoolAdminDashboard from './pages/SchoolAdminDashboard';
import SchoolDashboard from './pages/SchoolDashboard';
import AddStudent from './pages/AddStudent';
import StudentManagement from './pages/StudentManagement';
import TeacherManagement from './pages/TeacherManagement';
import AddTeacher from './pages/AddTeacher';
import MainLayout from './components/MainLayout';

function App() {
  return (
    <AuthProvider>
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

          {/* ============================================
              SUPER ADMIN ROUTES - Central Dashboard
              ============================================ */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} />}>
            <Route path="/admin/dashboard" element={<DashboardOverview />} />
            <Route path="/super-admin/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/central-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/schools" element={<SchoolManagement />} />
            <Route path="/admin/schools/all" element={<SchoolManagement />} />
            <Route path="/admin/schools/add" element={<AddSchool />} />
            <Route path="/admin/schools/:id" element={<SchoolDetail />} />
            <Route path="/admin/planners" element={<AllPlanners />} />
            <Route path="/admin/planners/create" element={<CreatePlanner />} />
            <Route path="/admin/planners/:id" element={<ViewPlanner />} />
            <Route path="/admin/assessments" element={<AssessmentManagement />} />
            <Route path="/admin/assessments/templates" element={<AssessmentManagement view="templates" />} />
            <Route path="/admin/assessments/templates/create" element={<AssessmentManagement view="create-template" />} />
            <Route path="/admin/assessments/generated" element={<AssessmentManagement view="generated" />} />
            <Route path="/admin/cms" element={<CMSManagement />} />
            <Route path="/admin/cms/classes" element={<CMSManagement view="classes" />} />
            <Route path="/admin/cms/classes/add" element={<CMSManagement view="add-class" />} />
            <Route path="/admin/cms/subjects" element={<CMSManagement view="subjects" />} />
            <Route path="/admin/cms/subjects/add" element={<CMSManagement view="add-subject" />} />
            <Route path="/admin/cms/chapters" element={<CMSManagement view="chapters" />} />
            <Route path="/admin/cms/chapters/add" element={<CMSManagement view="add-chapter" />} />
            <Route path="/admin/cms/slos" element={<CMSManagement view="slos" />} />
            <Route path="/admin/cms/slos/add" element={<CMSManagement view="add-slo" />} />
            <Route path="/admin/cms/slos/upload" element={<CMSManagement view="upload-slo" />} />
            {/* Legacy route redirects */}
            <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/super-admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* ============================================
              SCHOOL ADMIN ROUTES - Tenant Isolated
              Iron-Clad Tenant Validation Active
              Allows: SCHOOL_ADMIN, CAMPUS_ADMIN, ADMIN (with campus_id)
              ============================================ */}
          <Route element={<TenantProtectedRoute allowedRoles={['SCHOOL_ADMIN', 'CAMPUS_ADMIN', 'ADMIN']} requireTenantMatch={true} />}>
            {/* School Admin Dashboard with Figma design */}
            <Route path="/campus/:tenantId/dashboard" element={<SchoolAdminDashboard />} />
            <Route path="/campus/:tenantId/students" element={<StudentManagement />} />
            <Route path="/campus/:tenantId/students/add" element={<AddStudent />} />
            <Route path="/campus/:tenantId/teachers" element={<TeacherManagement />} />
            <Route path="/campus/:tenantId/teachers/add" element={<AddTeacher />} />
            <Route path="/campus/:tenantId/classes" element={<div>Classes Page</div>} />
            <Route path="/campus/:tenantId/planners" element={<AllPlanners />} />
            <Route path="/campus/:tenantId/planners/create" element={<CreatePlanner />} />
            <Route path="/campus/:tenantId/planners/:id" element={<ViewPlanner />} />
            <Route path="/campus/:tenantId/analytics" element={<div>Analytics Page</div>} />
            <Route path="/campus/:tenantId/settings" element={<div>Settings Page</div>} />
            {/* Legacy route redirect for school admins */}
            <Route path="/school-dashboard" element={<Navigate to={`/campus/${localStorage.getItem('campus_id') || 'unknown'}/dashboard`} replace />} />
          </Route>

          {/* ============================================
              SCHOOL ROLE ROUTES - School Admin Dashboard
              ============================================ */}
          <Route element={<ProtectedRoute allowedRoles={['SCHOOL']} />}>
            <Route path="/school/dashboard" element={<SchoolDashboard />} />
            <Route path="/school/students" element={<StudentManagement />} />
            <Route path="/school/students/add" element={<AddStudent />} />
            <Route path="/school/teachers" element={<TeacherManagement />} />
            <Route path="/school/teachers/add" element={<AddTeacher />} />
            <Route path="/school/classes" element={<div>Classes Page</div>} />
            <Route path="/school/planners" element={<AllPlanners />} />
            <Route path="/school/planners/create" element={<CreatePlanner />} />
            <Route path="/school/planners/:id" element={<ViewPlanner />} />
            <Route path="/school/analytics" element={<div>Analytics Page</div>} />
            <Route path="/school/settings" element={<div>Settings Page</div>} />
          </Route>

          {/* ============================================
              TEACHER ROUTES
              ============================================ */}
          <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
            <Route path="/school/students" element={<StudentManagement />} />
            <Route path="/school/teachers" element={<TeacherManagement />} />
          </Route>

          {/* ============================================
              FALLBACKS & SECURITY REDIRECTS
              ============================================ */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Security breach redirect handler */}
          <Route path="/login" element={<Login />} />
          
          {/* 404 - Catch all unmatched routes */}
          <Route path="*" element={<Navigate to="/unauthorized" replace />} />
        </Routes>
    </AuthProvider>
  );
}

export default App;

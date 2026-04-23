const fs = require('fs');
const path = require('path');

const files = {
  '.env.example': `VITE_API_BASE_URL=http://localhost:8000/api`,
  '.env': `VITE_API_BASE_URL=http://localhost:8000/api`,
  'package.json': `{
  "name": "amlos-react",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@stitches/react": "^1.2.8",
    "axios": "^1.6.8",
    "lucide-react": "^0.373.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3"
  },
  "devDependencies": {
    "@types/node": "^20.12.7",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@typescript-eslint/eslint-plugin": "^7.2.0",
    "@typescript-eslint/parser": "^7.2.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.6",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.2.2",
    "vite": "^5.2.0"
  }
}`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
  'tsconfig.node.json': `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}`,
  'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`,
  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
  'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
  'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AMLOS Admin Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
  'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`,
  'src/App.tsx': `import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SchoolPortal from './pages/SchoolPortal';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/superadmin" element={<ProtectedRoute allowedRoles={['SuperAdmin']}><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/school" element={<ProtectedRoute allowedRoles={['SchoolAdmin']}><SchoolPortal /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;`,
  'src/index.css': `/* Google Stitch Design System Base */
@import '@stitches/react';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}`,
  'src/vite-env.d.ts': `/// <reference types="vite/client" />`,
  'src/contexts/AuthContext.tsx': `import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (data: AuthResponse) => {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};`,
  'src/components/ProtectedRoute.tsx': `import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'SuperAdmin') return <Navigate to="/superadmin" replace />;
    if (user.role === 'SchoolAdmin') return <Navigate to="/school" replace />;
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;`,
  'src/components/Sidebar.tsx': `import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Users } from 'lucide-react';
import { styled } from '@stitches/react';

const SidebarContainer = styled('div', {
  width: '256px',
  height: '100vh',
  backgroundColor: '#ffffff',
  borderRight: '1px solid #e5e7eb',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  top: 0
});

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <SidebarContainer>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">AMLOS</h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{user?.role}</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {user?.role === 'SuperAdmin' && (
          <button
            className={\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${location.pathname.includes('/superadmin') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}\`}
            onClick={() => navigate('/superadmin')}
          >
            <Home size={20} /><span>Schools</span>
          </button>
        )}
        {user?.role === 'SchoolAdmin' && (
          <button
            className={\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors \${location.pathname.includes('/school') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}\`}
            onClick={() => navigate('/school')}
          >
            <Users size={20} /><span>Students</span>
          </button>
        )}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="mb-4 px-4 text-sm text-gray-600 truncate">{user?.email}</div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={20} /><span>Log out</span>
        </button>
      </div>
    </SidebarContainer>
  );
};
export default Sidebar;`,
  'src/components/Button.tsx': `import React, { ButtonHTMLAttributes } from 'react';
import { styled } from '@stitches/react';

const StyledButton = styled('button', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '0.375rem',
  fontWeight: 500,
  transition: 'all 0.2s',
  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
  variants: {
    variant: {
      primary: { backgroundColor: '#3b82f6', color: 'white', '&:hover:not(:disabled)': { backgroundColor: '#2563eb' } },
      secondary: { backgroundColor: '#f3f4f6', color: '#1f2937', '&:hover:not(:disabled)': { backgroundColor: '#e5e7eb' } },
      danger: { backgroundColor: '#ef4444', color: 'white', '&:hover:not(:disabled)': { backgroundColor: '#dc2626' } },
    },
    size: {
      sm: { fontSize: '0.875rem', padding: '0.375rem 0.75rem' },
      md: { fontSize: '1rem', padding: '0.5rem 1rem' },
      lg: { fontSize: '1.125rem', padding: '0.75rem 1.5rem' },
    },
    fullWidth: { true: { width: '100%' } },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, isLoading, ...props }) => {
  return <StyledButton {...props} disabled={isLoading || props.disabled}>{isLoading ? 'Loading...' : children}</StyledButton>;
};
export default Button;`,
  'src/components/Modal.tsx': `import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { styled } from '@stitches/react';

const Overlay = styled('div', {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50,
});

const ModalContainer = styled('div', {
  backgroundColor: 'white', borderRadius: '0.5rem',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto', position: 'relative',
});

interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children: ReactNode; }

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
        </div>
        <div className="p-6">{children}</div>
      </ModalContainer>
    </Overlay>
  );
};
export default Modal;`,
  'src/components/Table.tsx': `import React from 'react';
import { styled } from '@stitches/react';

const TableWrapper = styled('div', {
  width: '100%', overflowX: 'auto', backgroundColor: 'white', borderRadius: '0.5rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
});

const StyledTable = styled('table', { width: '100%', borderCollapse: 'collapse', textAlign: 'left' });
const Th = styled('th', { padding: '0.75rem 1.5rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' });
const Td = styled('td', { padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', color: '#374151' });

interface Column<T> { header: string; accessor: keyof T | ((item: T) => React.ReactNode); }
interface TableProps<T> { data: T[]; columns: Column<T>[]; keyExtractor: (item: T) => string; }

function Table<T>({ data, columns, keyExtractor }: TableProps<T>) {
  if (data.length === 0) return <TableWrapper><div className="p-8 text-center text-gray-500">No data available</div></TableWrapper>;
  return (
    <TableWrapper>
      <StyledTable>
        <thead><tr>{columns.map((col, idx) => <Th key={idx}>{col.header}</Th>)}</tr></thead>
        <tbody>
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="hover:bg-gray-50">
              {columns.map((col, idx) => (
                <Td key={idx}>{typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as unknown as React.ReactNode)}</Td>
              ))}
            </tr>
          ))}
        </tbody>
      </StyledTable>
    </TableWrapper>
  );
}
export default Table;`,
  'src/pages/Login.tsx': `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Button from '../components/Button';
import { AuthResponse } from '../types';
import { styled } from '@stitches/react';

const LoginContainer = styled('div', { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' });
const LoginCard = styled('div', { backgroundColor: 'white', padding: '2.5rem', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '28rem' });

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      login(response.data);
      if (response.data.user.role === 'SuperAdmin') navigate('/superadmin');
      else navigate('/school');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AMLOS</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input type="email" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input type="password" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" fullWidth isLoading={isLoading}>Sign In</Button>
        </form>
      </LoginCard>
    </LoginContainer>
  );
};
export default Login;`,
  'src/pages/SuperAdminDashboard.tsx': `import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { School } from '../types';
import Sidebar from '../components/Sidebar';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';

const SuperAdminDashboard: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSchools = async () => {
    try { setIsLoading(true); const response = await api.get('/schools'); setSchools(response.data); } 
    catch (err) { console.error('Failed to fetch schools', err); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchSchools(); }, []);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true); setError('');
    try {
      await api.post('/schools', formData);
      setIsModalOpen(false); setFormData({ name: '', location: '' });
      fetchSchools();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create school'); } 
    finally { setCreateLoading(false); }
  };

  const columns = [
    { header: 'School ID', accessor: 'id' as keyof School },
    { header: 'Name', accessor: 'name' as keyof School },
    { header: 'Location', accessor: 'location' as keyof School },
  ];

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-bold text-gray-900">Schools</h1><p className="text-gray-600 mt-1">Manage all participating schools</p></div>
            <Button onClick={() => setIsModalOpen(true)}>+ Add School</Button>
          </div>
          {isLoading ? <div>Loading schools...</div> : <Table data={schools} columns={columns} keyExtractor={(school) => school.id} />}
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New School">
        <form onSubmit={handleCreateSchool} className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">School Name</label><input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-md" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-md" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
          <div className="pt-4 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button type="submit" isLoading={createLoading}>Create</Button></div>
        </form>
      </Modal>
    </div>
  );
};
export default SuperAdminDashboard;`,
  'src/pages/SchoolPortal.tsx': `import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Student } from '../types';
import Sidebar from '../components/Sidebar';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Edit2, Trash2 } from 'lucide-react';

const SchoolPortal: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ name: '', class: '', parent_contact: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStudents = async () => {
    try { setIsLoading(true); const response = await api.get('/students'); setStudents(response.data); } 
    catch (err) { console.error('Failed to fetch students', err); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true); setError('');
    try {
      await api.post('/students', formData);
      setIsCreateOpen(false); setFormData({ name: '', class: '', parent_contact: '' });
      fetchStudents();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to register student'); } 
    finally { setActionLoading(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStudent) return;
    setActionLoading(true); setError('');
    try {
      await api.put(\`/students/\${selectedStudent.id}\`, formData);
      setIsEditOpen(false); setSelectedStudent(null);
      fetchStudents();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to update student'); } 
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await api.delete(\`/students/\${selectedStudent.id}\`);
      setIsDeleteOpen(false); setSelectedStudent(null);
      fetchStudents();
    } catch (err) { console.error('Failed to delete student', err); } 
    finally { setActionLoading(false); }
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({ name: student.name, class: student.class, parent_contact: student.parent_contact });
    setIsEditOpen(true);
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof Student },
    { header: 'Name', accessor: 'name' as keyof Student },
    { header: 'Class', accessor: 'class' as keyof Student },
    { header: 'Parent Contact', accessor: 'parent_contact' as keyof Student },
    {
      header: 'Actions',
      accessor: (student: Student) => (
        <div className="flex gap-2">
          <button onClick={() => openEditModal(student)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={18} /></button>
          <button onClick={() => { setSelectedStudent(student); setIsDeleteOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-bold text-gray-900">Students</h1><p className="text-gray-600 mt-1">Manage enrolled students</p></div>
            <Button onClick={() => { setFormData({ name: '', class: '', parent_contact: '' }); setIsCreateOpen(true); }}>+ Register Student</Button>
          </div>
          {isLoading ? <div>Loading students...</div> : <Table data={students} columns={columns} keyExtractor={(student) => student.id} />}
        </div>
      </div>
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register New Student">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-md" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Class</label><input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-md" value={formData.class} onChange={(e) => setFormData({ ...formData, class: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Parent Contact</label><input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-md" value={formData.parent_contact} onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })} /></div>
          <div className="pt-4 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button><Button type="submit" isLoading={actionLoading}>Register</Button></div>
        </form>
      </Modal>
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Student">
        <form onSubmit={handleEdit} className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-md" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Class</label><input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-md" value={formData.class} onChange={(e) => setFormData({ ...formData, class: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Parent Contact</label><input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-md" value={formData.parent_contact} onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })} /></div>
          <div className="pt-4 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button><Button type="submit" isLoading={actionLoading}>Save Changes</Button></div>
        </form>
      </Modal>
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Student">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete <strong>{selectedStudent?.name}</strong>? This action cannot be undone.</p>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button type="button" variant="danger" onClick={handleDelete} isLoading={actionLoading}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default SchoolPortal;`,
  'src/services/api.ts': `import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
export default api;`,
  'src/types/index.ts': `export type Role = 'SuperAdmin' | 'SchoolAdmin';

export interface User {
  id: string;
  email: string;
  role: Role;
  school_id?: string;
}

export interface School {
  id: string;
  name: string;
  location: string;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  school_id: string;
  name: string;
  class: string;
  parent_contact: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}`,
  'README.md': `# AMLOS React\nProduction-ready React admin portal with SuperAdmin and School Admin roles.\n\n## Tech Stack\n- React 18, Vite, TypeScript 5\n- Tailwind CSS 3 + Google Stitch (\`@stitches/react\`)\n- React Router 6, Axios\n\n## Setup\n1. \`npm install\`\n2. Create \`.env\` from \`.env.example\` and set your \`VITE_API_BASE_URL\`\n3. \`npm run dev\``
};

const setupDir = 'c:/Users/samee/Desktop/AMLOS';

for (const [filepath, content] of Object.entries(files)) {
  const fullPath = path.join(setupDir, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

console.log('Setup complete!');

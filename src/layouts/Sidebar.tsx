import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, Users, BookOpen } from 'lucide-react';
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
        <p className="text-sm text-gray-500 mt-1 capitalize">{user?.role?.replace('_', ' ')}</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {user?.role === 'ADMIN' && (
          <button
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname.includes('/super-admin-dashboard') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => navigate('/super-admin-dashboard')}
          >
            <Home size={20} /><span>Schools</span>
          </button>
        )}
        {user?.role === 'SCHOOL_ADMIN' && (
          <button
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname.includes('/school-dashboard') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => navigate('/school-dashboard')}
          >
            <Users size={20} /><span>Students</span>
          </button>
        )}
        {user?.role === 'TEACHER' && (
          <button
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname.includes('/teacher-dashboard') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => navigate('/teacher-dashboard')}
          >
            <BookOpen size={20} /><span>Dashboard</span>
          </button>
        )}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="mb-4 px-1 text-sm text-gray-600 truncate">{user?.email}</div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={20} /><span>Log out</span>
        </button>
      </div>
    </SidebarContainer>
  );
};
export default Sidebar;
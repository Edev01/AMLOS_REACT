import React, { useState } from 'react';
import { LogOut, School, ChevronDown, ChevronUp, List, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  onAddSchoolClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose, onAddSchoolClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSchoolMenuOpen, setIsSchoolMenuOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-slate-900 text-slate-100 shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-content-center rounded-xl bg-indigo-500">
                <School size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold">AMLOS</h1>
                <p className="text-xs text-slate-300">Admin Portal</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-white/5 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-300">Signed in as</p>
              <p className="truncate text-sm font-medium">{user?.email ?? 'user@example.com'}</p>
              <p className="mt-1 text-xs text-slate-400">{user?.role?.replace('_', ' ') ?? 'User'}</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-5 space-y-2">
            <div>
              <button
                type="button"
                onClick={() => setIsSchoolMenuOpen(!isSchoolMenuOpen)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  isSchoolMenuOpen ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-900/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <School size={18} />
                  School Management
                </div>
                {isSchoolMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {isSchoolMenuOpen && (
                <div className="mt-2 space-y-1 pl-4">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/super-admin-dashboard');
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <List size={16} />
                    All Schools
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onAddSchoolClick) onAddSchoolClick();
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <PlusCircle size={16} />
                    Add School
                  </button>
                </div>
              )}
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10 hover:text-rose-100"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

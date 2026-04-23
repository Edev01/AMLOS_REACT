import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import api from '../api/services/api';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import SchoolsTable, { SchoolRow } from '../components/SchoolsTable';
import AddSchoolModal, { CreateSchoolPayload } from '../components/AddSchoolModal';

const SuperAdminDashboard: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingSchool, setIsCreatingSchool] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mapSchoolPayload = useCallback((item: any): SchoolRow => {
    const name = item?.name ?? item?.school_name ?? 'Unnamed School';
    const location = item?.location ?? item?.address ?? 'N/A';
    const createdAtRaw = item?.created_at ?? item?.createdAt;
    const createdAt = createdAtRaw ? new Date(createdAtRaw).toLocaleDateString() : '-';

    return {
      id: String(item?.id ?? crypto.randomUUID()),
      name,
      location,
      createdAt,
    };
  }, []);

  const fetchSchools = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/api/auth/schools');
      const payload = response.data;
      const schoolsData = Array.isArray(payload) ? payload : payload?.results ?? payload?.data ?? [];
      setSchools(schoolsData.map(mapSchoolPayload));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const errorMsg = err.response?.data?.message || err.response?.data?.detail || 'Failed to fetch schools.';
        setError(errorMsg);
      } else {
        setError('Failed to fetch schools.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [mapSchoolPayload]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleCreateSchool = async (payload: CreateSchoolPayload) => {
    setIsCreatingSchool(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/api/auth/school/create', payload);
      setIsModalOpen(false);
      setSuccessMsg('School added successfully.');
      await fetchSchools();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const errorMsg = err.response?.data?.message || err.response?.data?.detail || 'Failed to add school.';
        setError(errorMsg);
      } else {
        setError('Failed to add school.');
      }
    } finally {
      setIsCreatingSchool(false);
    }
  };

  const stats = useMemo(() => {
    return [
      { label: 'Total Schools', value: schools.length.toString() },
      { label: 'Active Schools', value: schools.length.toString() },
    ];
  }, [schools]);

  const handleDeleteClick = () => {
    setSuccessMsg('Delete action can be wired to DELETE /schools/{id}/ when needed.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleEditClick = () => {
    setSuccessMsg('Edit action can be wired to PUT /schools/{id}/ when needed.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} onAddSchoolClick={() => setIsModalOpen(true)} />

      <div className="lg:pl-72">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="rounded-xl border border-slate-300 bg-white p-2 text-slate-600 shadow-sm lg:hidden"
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">School Management</h1>
                  <p className="text-sm text-slate-600 sm:text-base">Manage all participating schools</p>
                </div>
              </div>
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus size={16} />
                Add New School
              </Button>
            </div>

            {successMsg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMsg}</div>}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </section>

            <SchoolsTable
              schools={schools}
              isLoading={isLoading}
              error={error}
              onDelete={handleDeleteClick}
              onEdit={handleEditClick}
            />
          </div>
        </main>
      </div>

      <AddSchoolModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSchool}
        isSubmitting={isCreatingSchool}
        error={error}
      />
    </div>
  );
};
export default SuperAdminDashboard;

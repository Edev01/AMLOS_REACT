import React, { useState, useEffect } from 'react';
import api from '../api/services/api';
import axios from 'axios';
import { Student } from '../types';
import Sidebar from '../layouts/Sidebar';
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
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to register student');
      } else {
        setError('Failed to register student');
      }
    } finally { setActionLoading(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStudent) return;
    setActionLoading(true); setError('');
    try {
      await api.put(`/students/${selectedStudent.id}`, formData);
      setIsEditOpen(false); setSelectedStudent(null);
      fetchStudents();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to update student');
      } else {
        setError('Failed to update student');
      }
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await api.delete(`/students/${selectedStudent.id}`);
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
export default SchoolPortal;
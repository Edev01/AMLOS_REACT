import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examTypeService, ExamType } from '../api/services/examTypeService';
import { X, Save, Trash2, Pencil, Plus, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import toast from 'react-hot-toast';

interface ExamTypesModalProps {
  grade: string;
  isOpen: boolean;
  onClose: () => void;
}

const ExamTypesModal: React.FC<ExamTypesModalProps> = ({ grade, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [formName, setFormName] = useState('');
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const { data: allExamTypes, isLoading } = useQuery({
    queryKey: ['cms', 'exam-types'],
    queryFn: examTypeService.getExamTypes,
    enabled: isOpen,
  });

  const gradeExamTypes = React.useMemo(() => {
    if (!allExamTypes) return [];
    const list = Array.isArray(allExamTypes) ? allExamTypes : (allExamTypes.data || []);
    if (!Array.isArray(list)) return [];
    return list.filter((et: ExamType) => et.grade === grade);
  }, [allExamTypes, grade]);

  const createMutation = useMutation({
    mutationFn: (name: string) => examTypeService.createExamType({ name, grade }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'exam-types'] });
      setFormName('');
      toast.success('Exam type added');
    },
    onError: () => toast.error('Failed to add exam type'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string | number; name: string }) =>
      examTypeService.updateExamType(id, { name, grade }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'exam-types'] });
      setEditingId(null);
      setFormName('');
      toast.success('Exam type updated');
    },
    onError: () => toast.error('Failed to update exam type'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => examTypeService.deleteExamType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'exam-types'] });
      toast.success('Exam type deleted');
    },
    onError: () => toast.error('Failed to delete exam type'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, name: formName });
    } else {
      createMutation.mutate(formName);
    }
  };

  const startEditing = (et: ExamType) => {
    setEditingId(et.id);
    setFormName(et.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Exam Types for ${grade}`}>
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Mid Term"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {editingId ? (
            <>
              <Button type="submit" variant="primary" disabled={updateMutation.isPending || !formName.trim()}>
                {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Update
              </Button>
              <Button onClick={cancelEditing} variant="secondary" type="button">Cancel</Button>
            </>
          ) : (
            <Button type="submit" variant="primary" disabled={createMutation.isPending || !formName.trim()}>
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add
            </Button>
          )}
        </form>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 flex justify-center">
              <Loader2 className="animate-spin text-blue-500" />
            </div>
          ) : gradeExamTypes.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No exam types added for this grade yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {gradeExamTypes.map((et: ExamType) => (
                <div key={et.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
                  <span className="text-sm font-medium text-slate-800">{et.name}</span>
                  <div className="flex gap-2">
                    <button type="button" title="Edit" onClick={() => startEditing(et)} className="rounded-lg p-1.5 transition text-blue-600 hover:bg-blue-50">
                      <Pencil size={15} />
                    </button>
                    <button type="button" title="Delete" onClick={() => { if(confirm('Are you sure?')) deleteMutation.mutate(et.id) }} className="rounded-lg p-1.5 transition text-red-500 hover:bg-red-50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ExamTypesModal;

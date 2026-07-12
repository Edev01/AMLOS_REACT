import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, User, Mail, Phone, Users, Shield, Loader2, AlertCircle } from 'lucide-react';
import { paperCheckerService } from '../api/services/paperCheckerService';
import DashboardLayout from '../components/DashboardLayout';

const PaperCheckerDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [checker, setChecker] = useState<any>(null);

  // Fetch all checkers and find this specific one
  // Alternatively, we could fetch by ID if an endpoint existed, but list API is safe.
  const { data: checkers = [], isLoading, error } = useQuery({
    queryKey: ['paper-checkers'],
    queryFn: paperCheckerService.listCheckers,
  });

  useEffect(() => {
    if (checkers.length > 0) {
      const found = checkers.find((c: any) => String(c.id) === String(id));
      if (found) setChecker(found);
    }
  }, [checkers, id]);

  const assignments = Array.isArray(checker?.assignments || checker?.assigned_subjects)
    ? (checker.assignments || checker.assigned_subjects)
    : (checker?.assigned_subject || checker?.subject ? [
        {
          subject: checker.assigned_subject || checker.subject,
          portion: checker.portion || 'FULL',
          students: checker.assigned_students || checker.students,
          student_ids: checker.assigned_student_ids || checker.student_ids
        }
      ] : []);

  if (isLoading) {
    return (
      <DashboardLayout activePage="paper-checkers">
        <div className="flex items-center justify-center h-[60vh] gap-3 text-slate-500">
          <Loader2 className="animate-spin text-blue-600" size={24} /><span>Loading checker details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || (!isLoading && !checker)) {
    return (
      <DashboardLayout activePage="paper-checkers">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertCircle size={48} className="text-red-400" />
          <h2 className="text-xl font-bold text-gray-900">Checker Not Found</h2>
          <button onClick={() => navigate('/admin/paper-checkers')} className="text-blue-600 hover:underline">Go Back</button>
        </div>
      </DashboardLayout>
    );
  }

  const name = [checker.first_name, checker.last_name].filter(Boolean).join(' ') || checker.email?.split('@')[0] || 'Unknown Checker';

  return (
    <DashboardLayout activePage="paper-checkers">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/paper-checkers')} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-slate-100 flex items-center gap-3">
              {name}
              <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">Paper Checker</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detailed view of assignments and profile</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8 flex flex-col items-center">
            <div className="w-28 h-28 rounded-full bg-white p-1.5 border-2 border-blue-50 shadow-sm mb-5">
              {checker.profile_image ? (
                <img src={checker.profile_image} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-4xl shadow-inner">
                  {(checker.email || 'C')[0].toUpperCase()}
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 text-center">{name}</h2>
            <p className="text-sm text-gray-400 mb-6 font-medium">ID #{checker.id}</p>
            
            <div className="space-y-4 w-full">
              <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-500 shrink-0"><Mail size={16} /></div>
                <span className="text-gray-700 font-medium truncate">{checker.email || 'N/A'}</span>
              </div>
              {checker.phone && (
                <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-500 shrink-0"><Phone size={16} /></div>
                  <span className="text-gray-700 font-medium">{checker.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-500 shrink-0"><Shield size={16} /></div>
                <span className="text-blue-700 font-medium">Paper Checker</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Assignments Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Assigned Subjects & Portions</h2>
                <p className="text-xs text-gray-500 font-medium">Total assignments: {assignments.length}</p>
              </div>
            </div>
            
            <div className="p-6">
              {assignments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
                  <h3 className="text-gray-700 font-bold mb-1">No assignments</h3>
                  <p className="text-sm text-gray-500">This paper checker has no subjects assigned yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {assignments.map((assignment: any, idx: number) => {
                    const subjectName = assignment.subject?.name || assignment.subject_name || assignment.subject || 'Unknown Subject';
                    const portion = assignment.portion || 'FULL';
                    
                    let studentsList = 'All Students';
                    if (Array.isArray(assignment.students) && assignment.students.length > 0) {
                      studentsList = assignment.students.map((s: any) => typeof s === 'object' ? (`${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || s.id) : s).join(', ');
                    } else if (Array.isArray(assignment.student_ids) && assignment.student_ids.length > 0) {
                      studentsList = assignment.student_ids.join(', ');
                    } else if (assignment.student_ids) {
                      studentsList = assignment.student_ids;
                    }

                    return (
                      <div key={idx} className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-gray-800 text-lg">{subjectName}</h3>
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 uppercase">{portion} PORTION</span>
                        </div>
                        <div className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5"><Users size={14} className="text-gray-500" /> Assigned Students:</span>
                          <span className="text-gray-600 block leading-relaxed">{studentsList}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default PaperCheckerDetail;

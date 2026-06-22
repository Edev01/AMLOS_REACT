import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, BookOpen, Layers, GraduationCap, Info, Map, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import { studyPlanService } from '../api/services/studyPlanService';

const ViewPlanner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().split('T')[0]);

  const { data: planner, isLoading, isError } = useQuery({
    queryKey: ['planner', id],
    queryFn: async () => {
      try {
        const p = await studyPlanService.getPlanDetails(id!);
        return p?.data || p?.plan || p?.study_plan || p?.results || p;
      } catch (err) {
        // Fallback: fetch all and find the one
        const response = await studyPlanService.listPlans();
        const list = Array.isArray(response) ? response : 
                     response?.plans ? response.plans : 
                     response?.results ? response.results : 
                     response?.data ? response.data : [];
        const found = list.find((p: any) => String(p.id || p._id || p.plan_id) === String(id));
        if (!found) throw new Error('Planner not found');
        return found;
      }
    },
    enabled: !!id,
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['planner-schedule', id, selectedDate],
    queryFn: async () => {
      try {
        const response = await studyPlanService.getPlanDaySchedule(id!, selectedDate);
        return response?.data || response?.schedule || response || null;
      } catch (err) {
        return null; // Ignore errors if schedule not generated or empty
      }
    },
    enabled: !!id && !!selectedDate,
  });

  const completeSloMutation = useMutation({
    mutationFn: (planSloId: number | string) => studyPlanService.markSloComplete(planSloId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-schedule', id, selectedDate] });
      toast.success('SLO marked as completed!');
    },
    onError: () => toast.error('Failed to mark SLO as completed'),
  });

  const completePlanMutation = useMutation({
    mutationFn: () => studyPlanService.markPlanComplete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', id] });
      toast.success('Plan marked as completed!');
    },
    onError: () => toast.error('Failed to complete plan'),
  });

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <DashboardLayout activePage="all-planner">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading planner details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !planner) {
    return (
      <DashboardLayout activePage="all-planner">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={handleBack} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Planner Details</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-2xl mx-auto mt-12">
          <h3 className="text-lg font-bold text-red-700 mb-2">Planner Not Found</h3>
          <p className="text-sm text-red-600 mb-4">The planner you are looking for does not exist or you don't have permission to view it.</p>
          <button onClick={handleBack} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Safe data extraction with aggressive fallbacks
  const name = planner.title || planner.plan_name || planner.name || planner.planner_name || 'Untitled Planner';
  const grade = planner.grade || planner.grade_level || 'N/A';
  const examType = planner.plan_type || planner.exam_type || planner.examType || 'N/A';
  const startDate = planner.start_date || planner.startDate || 'N/A';
  const endDate = planner.end_date || planner.endDate || 'N/A';
  const mode = planner.mode || planner.study_mode || 'PARALLEL';
  const minTime = planner.min_study_time_daily || planner.min_study_time || planner.daily_limit_minutes || planner.minStudyTimeDaily || 0;
  const maxTime = planner.max_study_time_daily || planner.max_study_time || planner.maxStudyTimeDaily || 0;
  
  const subjects = (() => {
    if (planner.subject_order && Array.isArray(planner.subject_order)) {
      return planner.subject_order.flat().filter(Boolean);
    }
    if (Array.isArray(planner.subjects) && planner.subjects.length > 0) return planner.subjects;
    if (planner.subject_names && Array.isArray(planner.subject_names)) return planner.subject_names;
    return [];
  })();

  const sloCount = (() => {
    if (Array.isArray(planner.slo_ids)) return planner.slo_ids.length;
    if (typeof planner.slo_ids === 'string') {
      try { const arr = JSON.parse(planner.slo_ids); if (Array.isArray(arr)) return arr.length; } catch(e) {}
      return planner.slo_ids.split(',').filter(Boolean).length;
    }
    if (Array.isArray(planner.slos)) return planner.slos.length;
    if (Array.isArray(planner.sloIds)) return planner.sloIds.length;
    if (typeof planner.slo_count === 'number') return planner.slo_count;
    if (typeof planner.sloCount === 'number') return planner.sloCount;
    if (typeof planner.total_slos === 'number') return planner.total_slos;
    if (typeof planner.totalSlos === 'number') return planner.totalSlos;
    
    // Aggressive fallback: search through all keys for SLO
    for (const key of Object.keys(planner)) {
      const k = key.toLowerCase();
      if (k.includes('slo') && Array.isArray(planner[key])) return planner[key].length;
      if (k.includes('slo') && typeof planner[key] === 'string' && planner[key].includes(',')) return planner[key].split(',').filter(Boolean).length;
      if ((k === 'slocount' || k === 'totalslos' || k === 'assignedslos' || k === 'slo_count') && typeof planner[key] === 'number') return planner[key];
    }
    
    return planner.topics_count || planner.topics || planner.topicsCount || 0;
  })();

  return (
    <DashboardLayout activePage="all-planner">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
            <p className="text-sm text-gray-500 mt-1">View detailed configuration and parameters for this planner</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            planner.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
            planner.status === 'draft' ? 'bg-amber-100 text-amber-700' : 
            'bg-gray-100 text-gray-700'
          }`}>
            {planner.status || 'Active'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Key Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Info size={20} className="text-blue-600" />
              General Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Grade</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{grade}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Exam Type</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{examType}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Duration</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{startDate} to {endDate}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Daily Study Time</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{minTime}m - {maxTime}m</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <Map size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Study Mode</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {mode === 'PARALLEL' ? 'Parallel (Mixed Subjects)' : 
                     mode === 'SEQUENTIAL' ? 'Sequential (One by one)' : 
                     'Custom Schedule'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                  <Layers size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total SLOs</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{sloCount} Objectives</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Subjects & Content */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-600" />
              Included Subjects
            </h3>
            
            {subjects.length > 0 ? (
              <ul className="space-y-3">
                {subjects.map((sub: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-indigo-900 font-medium text-sm">
                    <div className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    {sub}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No subjects explicitly listed</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Schedule Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Daily Schedule</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => completePlanMutation.mutate()}
              disabled={completePlanMutation.isPending || planner.status === 'completed'}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {completePlanMutation.isPending ? 'Processing...' : planner.status === 'completed' ? 'Plan Completed' : 'Complete Entire Plan'}
            </button>
            <input 
              type="date" 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {scheduleLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">Loading schedule...</div>
        ) : schedule && (schedule.slos?.length > 0 || schedule.length > 0) ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-sm font-semibold text-gray-600">Subject</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">SLO Title</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(schedule.slos || schedule).map((slo: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-4 text-sm text-gray-900 font-medium">{slo.subject_name || 'N/A'}</td>
                      <td className="p-4 text-sm text-gray-600">{slo.title || slo.slo_name || 'N/A'}</td>
                      <td className="p-4">
                        {slo.is_completed || slo.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                            <CheckCircle size={14} /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                            <Clock size={14} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {!(slo.is_completed || slo.status === 'completed') && (
                          <button 
                            onClick={() => completeSloMutation.mutate(slo.id || slo.plan_slo_id)}
                            disabled={completeSloMutation.isPending}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
                          >
                            Mark Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 border-dashed p-8 text-center">
            <Calendar size={32} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Schedule</h3>
            <p className="text-sm text-gray-500">No SLOs scheduled for {selectedDate}.</p>
          </div>
        )}
      </div>
      
    </DashboardLayout>
  );
};

export default ViewPlanner;

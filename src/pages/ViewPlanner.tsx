import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, BookOpen, Layers, GraduationCap, Info, Map } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/services/api';

const ViewPlanner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: planner, isLoading, isError } = useQuery({
    queryKey: ['planner', id],
    queryFn: async () => {
      // First try to fetch the specific planner
      try {
        const response = await api.get(`/api/study-plans/${id}`);
        let p = response.data;
        if (p?.data && typeof p.data === 'object' && !Array.isArray(p.data)) {
          p = p.data;
        } else if (p?.plan && typeof p.plan === 'object') {
          p = p.plan;
        } else if (p?.study_plan && typeof p.study_plan === 'object') {
          p = p.study_plan;
        } else if (p?.results && typeof p.results === 'object' && !Array.isArray(p.results)) {
          p = p.results;
        }
        return p;
      } catch (err) {
        // Fallback: fetch all and find the one
        const response = await api.get('/api/study-plans');
        const list = Array.isArray(response.data) ? response.data : 
                     response.data?.plans ? response.data.plans : 
                     response.data?.results ? response.data.results : 
                     response.data?.data ? response.data.data : [];
        const found = list.find((p: any) => String(p.id || p._id || p.plan_id) === String(id));
        if (!found) throw new Error('Planner not found');
        return found;
      }
    },
    enabled: !!id,
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
      
      {/* Hidden debug view for developers to see raw data format if needed. 
          Uncomment the below block if data is still not mapping correctly. */}
      {/* 
      <div className="mt-8 p-4 bg-gray-900 rounded-xl overflow-x-auto">
        <h4 className="text-white font-bold mb-2">Raw API Data:</h4>
        <pre className="text-green-400 text-xs">
          {JSON.stringify(planner, null, 2)}
        </pre>
      </div> 
      */}
    </DashboardLayout>
  );
};

export default ViewPlanner;

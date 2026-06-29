import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import * as teacherService from '../api/services/teacherService';
import { ArrowLeft, Mail, Phone, BookOpen, GraduationCap, MapPin, Calendar, Clock, DollarSign } from 'lucide-react';

const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: teacher, isLoading, error } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => teacherService.getTeacherById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout activePage="all-teachers">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !teacher) {
    return (
      <DashboardLayout activePage="all-teachers">
        <div className="flex h-[50vh] flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-red-100 p-4">
            <Clock size={32} className="text-red-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Teacher Not Found</h2>
          <p className="mb-6 text-gray-500">The teacher you're looking for doesn't exist or there was an error.</p>
          <button onClick={() => navigate('/school/teachers')} className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700">
            Back to Teachers
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="all-teachers">
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/school/teachers')} className="flex items-center justify-center rounded-xl bg-white p-2.5 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Profile</h1>
            <p className="text-sm text-gray-500">View detailed information about the teacher</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="px-8 pb-8">
            <div className="relative -mt-16 mb-6 flex items-end justify-between">
              <div className="flex items-end gap-6">
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md ring-1 ring-gray-100">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                    {teacher.profile_image ? (
                      <img src={teacher.profile_image} alt={teacher.first_name} className="h-full w-full object-cover" />
                    ) : (
                      <GraduationCap size={40} className="text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-gray-900">{teacher.first_name} {teacher.last_name}</h2>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
                  </div>
                  <p className="text-lg font-medium text-gray-600">
                    {teacher.qualification ? `${teacher.qualification} · ` : ''}{teacher.subject || 'Teacher'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              {/* Professional Details */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">Professional Details</h3>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Subject</p>
                      <p className="font-semibold text-gray-900">{teacher.subject || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Qualification</p>
                      <p className="font-semibold text-gray-900">{teacher.qualification || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Experience</p>
                      <p className="font-semibold text-gray-900">{teacher.experience_years ? `${teacher.experience_years} Years` : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Salary</p>
                      <p className="font-semibold text-gray-900">{teacher.salary ? `PKR ${teacher.salary}` : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">Contact Information</h3>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <Mail size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium text-gray-500">Email Address</p>
                      <p className="font-semibold text-gray-900 truncate">{teacher.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Phone Number</p>
                      <p className="font-semibold text-gray-900">{teacher.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Date of Birth</p>
                      <p className="font-semibold text-gray-900">{teacher.date_of_birth || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Location</p>
                      <p className="font-semibold text-gray-900">N/A</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDetail;

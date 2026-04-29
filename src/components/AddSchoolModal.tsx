import React, { useEffect, useState } from 'react';
import Button from './Button';
import Modal from './Modal';
import { CreateSchoolPayload } from '../types';

interface AddSchoolModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: CreateSchoolPayload) => Promise<void>;
}

const AddSchoolModal: React.FC<AddSchoolModalProps> = ({ isOpen, isSubmitting, error, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    school_name:'', username:'', email:'', password:'',
    registration_number:'', address:'', website:'', established_year:'' as string|number,
  });
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setForm({ school_name:'',username:'',email:'',password:'',registration_number:'',address:'',website:'',established_year:'' });
      setFieldError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.school_name || !form.username || !form.email || !form.password || !form.address) {
      setFieldError('All required fields must be filled.'); return;
    }
    setFieldError('');
    await onSubmit({
      username: form.username,
      password: form.password,
      email: form.email,
      school_name: form.school_name,
      registration_number: form.registration_number || `REG-${Date.now()}`,
      address: form.address,
      website: form.website,
      established_year: Number(form.established_year) || new Date().getFullYear(),
    });
  };

  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); if (fieldError) setFieldError(''); };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New School">
      <form onSubmit={handleSubmit} className="space-y-4">
        {(fieldError || error) && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{fieldError || error}</div>}
        {[
          ['School Name','school_name','e.g. Greenfield Academy',true],
          ['Admin Username','username','e.g. school1',true],
          ['Email','email','school@gmail.com',true],
          ['Password','password','••••••••',true],
          ['Registration Number','registration_number','REG-2024-001',false],
          ['Address','address','Full address',true],
          ['Website','website','https://www.example.com',false],
          ['Established Year','established_year','e.g. 1995',false],
        ].map(([label, key, placeholder, required]) => (
          <div key={key as string}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {label as string} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={key === 'password' ? 'password' : key === 'established_year' ? 'number' : 'text'}
              value={(form as any)[key as string]}
              onChange={e => set(key as string, e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder={placeholder as string}
            />
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Add School</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSchoolModal;

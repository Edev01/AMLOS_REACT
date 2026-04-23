import React, { useEffect, useState } from 'react';
import Button from './Button';
import Modal from './Modal';

export interface CreateSchoolPayload {
  school_name: string;
  registration_number: string;
  address: string;
  website: string;
  established_year: number;
}

interface AddSchoolModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: CreateSchoolPayload) => Promise<void>;
}

const AddSchoolModal: React.FC<AddSchoolModalProps> = ({ isOpen, isSubmitting, error, onClose, onSubmit }) => {
  const [schoolName, setSchoolName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [establishedYear, setEstablishedYear] = useState<number | ''>('');
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSchoolName('');
      setRegistrationNumber('');
      setAddress('');
      setWebsite('');
      setEstablishedYear('');
      setFieldError('');
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = schoolName.trim();
    const trimmedRegNum = registrationNumber.trim();
    const trimmedAddress = address.trim();
    const trimmedWebsite = website.trim();

    if (!trimmedName || !trimmedRegNum || !trimmedAddress || !establishedYear) {
      setFieldError('School name, registration number, address, and established year are required.');
      return;
    }

    const currentYear = new Date().getFullYear();
    if (establishedYear > currentYear) {
      setFieldError('Established year cannot be in the future.');
      return;
    }

    setFieldError('');
    await onSubmit({
      school_name: trimmedName,
      registration_number: trimmedRegNum,
      address: trimmedAddress,
      website: trimmedWebsite,
      established_year: Number(establishedYear),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New School">
      <form onSubmit={handleSubmit} className="space-y-4">
        {(fieldError || error) && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{fieldError || error}</div>}

        <div>
          <label htmlFor="school_name" className="mb-1.5 block text-sm font-medium text-slate-700">
            School Name <span className="text-red-500">*</span>
          </label>
          <input
            id="school_name"
            value={schoolName}
            onChange={(event) => {
              setSchoolName(event.target.value);
              if (fieldError) setFieldError('');
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="e.g. Greenfield Academy"
          />
        </div>

        <div>
          <label htmlFor="registration_number" className="mb-1.5 block text-sm font-medium text-slate-700">
            Registration Number <span className="text-red-500">*</span>
          </label>
          <input
            id="registration_number"
            value={registrationNumber}
            onChange={(event) => {
              setRegistrationNumber(event.target.value);
              if (fieldError) setFieldError('');
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="e.g. REG-2024-001"
          />
        </div>

        <div>
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-slate-700">
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            id="address"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              if (fieldError) setFieldError('');
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 min-h-[80px]"
            placeholder="Full physical address"
          />
        </div>

        <div>
          <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-slate-700">
            Website URL
          </label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(event) => {
              setWebsite(event.target.value);
              if (fieldError) setFieldError('');
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="https://www.example.com"
          />
        </div>

        <div>
          <label htmlFor="established_year" className="mb-1.5 block text-sm font-medium text-slate-700">
            Established Year <span className="text-red-500">*</span>
          </label>
          <input
            id="established_year"
            type="number"
            value={establishedYear}
            onChange={(event) => {
              setEstablishedYear(event.target.value ? Number(event.target.value) : '');
              if (fieldError) setFieldError('');
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="e.g. 1990"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Add School
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSchoolModal;

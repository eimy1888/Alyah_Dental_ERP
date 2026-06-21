import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Phone, MapPin, Globe } from 'lucide-react';

const schema = z.object({
  clinicName:  z.string().min(2,  'Clinic name is required'),
  clinicEmail: z.string().email('Valid clinic email required'),
  branchName:  z.string().min(2,  'Branch name is required'),
  phone:       z.string().min(7,  'Valid phone required'),
  country:     z.string().min(1,  'Country is required'),
  city:        z.string().min(1,  'City is required'),
  address:     z.string().min(5,  'Address is required'),
});

function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-[0.12em] mb-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/10 ${
    err ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/60 focus:border-blue-400 focus:bg-white'
  }`;

export default function StepClinicInfo({ data, update, onNext }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      clinicName:  data.clinicName  || '',
      clinicEmail: data.clinicEmail || '',
      branchName:  data.branchName  || '',
      phone:       data.phone       || '',
      country:     data.country     || 'Ethiopia',
      city:        data.city        || 'Addis Ababa',
      address:     data.address     || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(vals => { update(vals); onNext(); })} className="space-y-5">

      {/* Section: Clinic */}
      <div>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
          <Building2 className="w-3 h-3" /> Clinic Details
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Clinic Name" icon={Building2} error={errors.clinicName?.message}>
            <input {...register('clinicName')} placeholder="Alyah Dental Clinic" className={inputCls(errors.clinicName)} />
          </Field>
          <Field label="Clinic Email" icon={Mail} error={errors.clinicEmail?.message}>
            <input {...register('clinicEmail')} type="email" placeholder="info@myclinic.com" className={inputCls(errors.clinicEmail)} />
          </Field>
        </div>
      </div>

      {/* Section: Branch + Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Main Branch Name" icon={Building2} error={errors.branchName?.message}>
          <input {...register('branchName')} placeholder="Bole Flagship" className={inputCls(errors.branchName)} />
        </Field>
        <Field label="Phone Number" icon={Phone} error={errors.phone?.message}>
          <input {...register('phone')} placeholder="+251 911 000 000" className={inputCls(errors.phone)} />
        </Field>
      </div>

      {/* Section: Location */}
      <div>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> Location
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="Country" icon={Globe} error={errors.country?.message}>
            <input {...register('country')} placeholder="Ethiopia" className={inputCls(errors.country)} />
          </Field>
          <Field label="City" icon={MapPin} error={errors.city?.message}>
            <input {...register('city')} placeholder="Addis Ababa" className={inputCls(errors.city)} />
          </Field>
        </div>
        <Field label="Street Address" icon={MapPin} error={errors.address?.message}>
          <textarea {...register('address')} placeholder="Bole Road, Building 45, Near Edna Mall..." rows={3}
            className={`${inputCls(errors.address)} resize-none`} />
        </Field>
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-2">
        <button type="submit"
          className="px-8 py-3 rounded-xl text-white font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}>
          Continue →
        </button>
      </div>
    </form>
  );
}

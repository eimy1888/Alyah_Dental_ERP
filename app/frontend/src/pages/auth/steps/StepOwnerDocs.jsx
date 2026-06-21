import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Lock, Eye, EyeOff, FileText, UploadCloud, CheckCircle2 } from 'lucide-react';

const schema = z.object({
  ownerName:       z.string().min(2,  'Owner name is required'),
  ownerEmail:      z.string().email('Valid email required'),
  ownerPhone:      z.string().optional(),
  password:        z.string().min(8,  'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const inputCls = (err) =>
  `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/10 ${
    err ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/60 focus:border-blue-400 focus:bg-white'
  }`;

export default function StepOwnerDocs({ data, update, onNext, onBack }) {
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ownerName:       data.ownerName       || '',
      ownerEmail:      data.ownerEmail      || '',
      ownerPhone:      data.ownerPhone      || '',
      password:        data.password        || '',
      confirmPassword: data.confirmPassword || '',
    },
  });

  const handleFile = (field, e) => {
    const file = e.target.files[0];
    if (file) update({ [field]: file });
  };

  return (
    <form onSubmit={handleSubmit(vals => { update(vals); onNext(); })} className="space-y-5">

      {/* Owner identity */}
      <div>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
          <User className="w-3 h-3" /> Owner / Administrator
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.12em] mb-1.5">Full name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input {...register('ownerName')} placeholder="Dr. Sara Tekle" className={`${inputCls(errors.ownerName)} pl-9`} />
            </div>
            {errors.ownerName && <p className="mt-1 text-[11px] text-red-500">{errors.ownerName.message}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.12em] mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input {...register('ownerEmail')} type="email" placeholder="owner@clinic.com" className={`${inputCls(errors.ownerEmail)} pl-9`} />
            </div>
            {errors.ownerEmail && <p className="mt-1 text-[11px] text-red-500">{errors.ownerEmail.message}</p>}
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.12em] mb-1.5">Phone (optional)</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input {...register('ownerPhone')} placeholder="+251 911 000 000" className={`${inputCls()} pl-9`} />
          </div>
        </div>
      </div>

      {/* Password */}
      <div>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> Account Password
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.12em] mb-1.5">Password</label>
            <div className="relative">
              <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                className={`${inputCls(errors.password)} pr-10`} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-[11px] text-red-500">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.12em] mb-1.5">Confirm password</label>
            <div className="relative">
              <input {...register('confirmPassword')} type={showCp ? 'text' : 'password'} placeholder="Repeat password"
                className={`${inputCls(errors.confirmPassword)} pr-10`} />
              <button type="button" onClick={() => setShowCp(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-[11px] text-red-500">{errors.confirmPassword.message}</p>}
          </div>
        </div>
      </div>

      {/* Document uploads */}
      <div>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> Documents <span className="text-gray-200 normal-case tracking-normal font-medium">(optional)</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { field: 'tradeLicense', label: 'Trade License' },
            { field: 'taxDocument',  label: 'Tax Document' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.12em] mb-1.5">{label}</label>
              <label className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 group
                hover:border-blue-300 hover:bg-blue-50/40
                border-gray-200 bg-gray-50/40">
                {data[field]
                  ? <><CheckCircle2 className="w-5 h-5 text-green-500" /><span className="text-xs text-green-600 font-semibold truncate max-w-[160px]">{data[field].name}</span></>
                  : <><UploadCloud className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" /><span className="text-[11px] text-gray-400 group-hover:text-blue-500 transition-colors">Upload PDF or image</span></>
                }
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleFile(field, e)} />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack}
          className="px-6 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors font-medium">
          ← Back
        </button>
        <button type="submit"
          className="px-8 py-2.5 rounded-xl text-white font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}>
          Continue →
        </button>
      </div>
    </form>
  );
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText } from 'lucide-react';

const schema = z.object({
  ownerName: z.string().min(2, 'Owner name is required'),
  ownerEmail: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function StepOwnerDocs({ data, update, onNext, onBack }) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      password: data.password,
      confirmPassword: data.confirmPassword,
    },
  });

  const handleFile = (field, e) => {
    const file = e.target.files[0];
    if (file) update({ [field]: file });
  };

  const onSubmit = (values) => {
    update(values);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner full name</label>
          <input
            {...register('ownerName')}
            placeholder="Dr. Sarah Johnson"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${errors.ownerName ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'}`}
          />
          {errors.ownerName && <p className="mt-1 text-xs text-red-500">{errors.ownerName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner email</label>
          <input
            {...register('ownerEmail')}
            placeholder="owner@clinic.com"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${errors.ownerEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'}`}
          />
          {errors.ownerEmail && <p className="mt-1 text-xs text-red-500">{errors.ownerEmail.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input
            type="password"
            {...register('password')}
            placeholder="Min 8 characters"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'}`}
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
          <input
            type="password"
            {...register('confirmPassword')}
            placeholder="Repeat password"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'}`}
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      {/* File uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { field: 'tradeLicense', label: 'Trade license' },
          { field: 'taxDocument', label: 'Tax document' },
        ].map(({ field, label }) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <label className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-500">
                {data[field] ? data[field].name : 'Click to upload PDF or image'}
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => handleFile(field, e)}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="px-6 py-3 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
          Back
        </button>
        <button type="submit" className="px-8 py-3 rounded-xl bg-[#1F4E79] text-white font-semibold text-sm hover:bg-blue-900 transition-all duration-200">
          Continue →
        </button>
      </div>
    </form>
  );
}
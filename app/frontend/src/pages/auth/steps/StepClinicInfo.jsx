import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  clinicName:  z.string().min(2,  'Clinic name is required'),
  clinicEmail: z.string().email('Valid clinic email required'),
  branchName:  z.string().min(2,  'Branch name is required'),
  phone:       z.string().min(7,  'Valid phone required'),
  country:     z.string().min(1,  'Country is required'),
  city:        z.string().min(1,  'City is required'),
  address:     z.string().min(5,  'Address is required'),
});

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

  const onSubmit = (values) => {
    update(values);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Clinic name + email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Clinic name</label>
          <input
            {...register('clinicName')}
            placeholder="Alyah Dental Clinic"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
              errors.clinicName ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
            }`}
          />
          {errors.clinicName && <p className="mt-1 text-xs text-red-500">{errors.clinicName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Clinic email</label>
          <input
            {...register('clinicEmail')}
            placeholder="info@myclinic.com"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
              errors.clinicEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
            }`}
          />
          {errors.clinicEmail && <p className="mt-1 text-xs text-red-500">{errors.clinicEmail.message}</p>}
        </div>
      </div>

      {/* Branch name + phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Main branch name</label>
          <input
            {...register('branchName')}
            placeholder="Bole Flagship"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
              errors.branchName ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
            }`}
          />
          {errors.branchName && <p className="mt-1 text-xs text-red-500">{errors.branchName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input
            {...register('phone')}
            placeholder="+251 911 000 000"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
              errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
            }`}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>
      </div>

      {/* Country + city */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
          <input
            {...register('country')}
            placeholder="Ethiopia"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
              errors.country ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
            }`}
          />
          {errors.country && <p className="mt-1 text-xs text-red-500">{errors.country.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
          <input
            {...register('city')}
            placeholder="Addis Ababa"
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
              errors.city ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
            }`}
          />
          {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
        <textarea
          {...register('address')}
          placeholder="Bole Road, Building 45..."
          rows={3}
          className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors resize-none ${
            errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400'
          }`}
        />
        {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          disabled
          className="px-6 py-3 rounded-xl text-sm text-gray-300 cursor-not-allowed"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-8 py-3 rounded-xl bg-[#1F4E79] text-white font-semibold text-sm hover:bg-blue-900 transition-all duration-200"
        >
          Continue →
        </button>
      </div>
    </form>
  );
}
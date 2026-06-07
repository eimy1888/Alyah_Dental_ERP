<?php

namespace App\Http\Requests\Landing;

use Illuminate\Foundation\Http\FormRequest;

class RegisterClinicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint — no auth needed
    }

    public function rules(): array
    {
        return [
            // Clinic details
            'clinic_name'    => ['required', 'string', 'max:255'],
            'clinic_email'   => ['required', 'email', 'max:255', 'unique:clinics,email'],
            'clinic_phone'   => ['required', 'string', 'max:20'],
            'clinic_address' => ['nullable', 'string', 'max:500'],
            'clinic_city'    => ['nullable', 'string', 'max:100'],
            'clinic_country' => ['nullable', 'string', 'max:100'],

            // Admin (owner) details
            'admin_name'     => ['required', 'string', 'max:255'],
            'admin_email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'admin_phone'    => ['nullable', 'string', 'max:20'],
            'admin_password' => ['required', 'string', 'min:8', 'confirmed'],

            // Plan & billing
            'plan_id'        => ['required', 'integer', 'exists:plans,id'],
            'billing_cycle'  => ['required', 'in:monthly,annual'],

            // Payment intent (not yet paid — payment happens in step 2)
            'payment_method' => ['required', 'in:telebirr,chapa,paypal,bank_transfer'],
        ];
    }

    public function messages(): array
    {
        return [
            'clinic_email.unique'   => 'A clinic with this email already exists.',
            'admin_email.unique'    => 'An account with this email already exists.',
            'plan_id.exists'        => 'The selected plan does not exist.',
            'admin_password.confirmed' => 'Password confirmation does not match.',
        ];
    }
}
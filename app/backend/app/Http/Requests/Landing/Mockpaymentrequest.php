<?php

namespace App\Http\Requests\Landing;

use Illuminate\Foundation\Http\FormRequest;

class MockPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'clinic_id'      => ['required', 'integer', 'exists:clinics,id'],
            'payment_method' => ['required', 'in:telebirr,chapa,paypal,bank_transfer'],
            // Simulated gateway data — in production this would be a webhook/callback
            'phone_number'   => ['required_if:payment_method,telebirr', 'nullable', 'string', 'max:20'],
            'transaction_id' => ['nullable', 'string', 'max:100'],  // mock reference
        ];
    }

    public function messages(): array
    {
        return [
            'clinic_id.exists'             => 'Clinic not found.',
            'phone_number.required_if'     => 'Phone number is required for Telebirr payments.',
        ];
    }
}
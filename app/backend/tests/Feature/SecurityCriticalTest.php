<?php

namespace Tests\Feature;

use App\Mail\ClinicApprovedMail;
use App\Models\Clinic;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class SecurityCriticalTest extends TestCase
{
    use DatabaseTransactions;

    public function test_platform_routes_reject_non_platform_roles_and_allow_platform_admin(): void
    {
        foreach (['clinic_admin', 'receptionist', 'dentist', 'accountant', 'patient'] as $role) {
            $user = User::factory()->create([
                'role' => $role,
                'is_active' => true,
            ]);

            $token = $user->createToken('test', ['*'], now()->addDays(7))->plainTextToken;

            $this->withToken($token)
                ->getJson('/api/v1/platform/users')
                ->assertForbidden();
        }

        $admin = User::factory()->create([
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        $token = $admin->createToken('test', ['*'], now()->addDays(7))->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/platform/users')
            ->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_clinic_approval_does_not_return_plaintext_temporary_password(): void
    {
        Mail::fake();

        $admin = User::factory()->create([
            'role' => 'platform_admin',
            'is_active' => true,
        ]);
        $token = $admin->createToken('test', ['*'], now()->addDays(7))->plainTextToken;

        $clinic = Clinic::create([
            'name' => 'Security Smile',
            'subdomain' => 'security-smile',
            'email' => 'owner@example.test',
            'phone' => '123456789',
            'status' => 'pending_platform_approval',
        ]);

        $response = $this->withToken($token)
            ->postJson("/api/v1/platform/clinics/{$clinic->id}/approve")
            ->assertOk()
            ->assertJsonMissingPath('temp_password')
            ->assertJsonMissing(['password' => true]);

        $this->assertStringNotContainsString('temp_password', $response->getContent());

        $clinicAdmin = User::where('clinic_id', $clinic->id)
            ->where('role', 'clinic_admin')
            ->firstOrFail();

        $this->assertTrue($clinicAdmin->must_change_password);

        Mail::assertSent(ClinicApprovedMail::class);
    }

    public function test_must_change_password_blocks_protected_routes_until_password_is_changed(): void
    {
        $user = User::factory()->create([
            'role' => 'clinic_admin',
            'is_active' => true,
            'password' => Hash::make('temporary-secret'),
            'must_change_password' => true,
        ]);

        $token = $user->createToken('test', ['*'], now()->addDays(7))->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/admin/dashboard')
            ->assertForbidden()
            ->assertJson([
                'code' => 'MUST_CHANGE_PASSWORD',
                'redirect_to' => '/change-password',
            ]);

        $this->withToken($token)
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => 'temporary-secret',
                'password' => 'new-secure-secret',
                'password_confirmation' => 'new-secure-secret',
            ])
            ->assertOk();

        $this->assertFalse($user->fresh()->must_change_password);
    }

    public function test_login_is_rate_limited_by_ip_and_email_after_five_failed_attempts(): void
    {
        RateLimiter::clear('login:' . sha1('limited@example.test|127.0.0.1'));

        User::factory()->create([
            'email' => 'limited@example.test',
            'password' => Hash::make('correct-password'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'limited@example.test',
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'limited@example.test',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_expired_tokens_are_rejected_and_logout_invalidates_tokens(): void
    {
        $user = User::factory()->create([
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        $expiredToken = $user->createToken('expired', ['*'], now()->subMinute())->plainTextToken;

        $this->withToken($expiredToken)
            ->getJson('/api/v1/platform/users')
            ->assertUnauthorized();

        $validToken = $user->createToken('valid', ['*'], now()->addDays(7))->plainTextToken;

        $this->withToken($validToken)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $tokenId = (int) explode('|', $validToken, 2)[0];
        $this->assertNull(PersonalAccessToken::find($tokenId));
    }
}

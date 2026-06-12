# Smart Appointment Flow — Design

## New Database Tables

### `treatment_plans`
```sql
id, clinic_id, branch_id, patient_id, gp_id (dentist user_id),
appointment_id (initial exam appointment),
title, diagnosis, status (draft|active|in_progress|pending_lab|completed|cancelled),
requires_lab (boolean), requires_specialist (boolean),
specialist_type (orthodontist|oral_surgeon|pediatric|etc),
total_sessions_planned, total_sessions_done,
deposit_required_pct (0-100), deposit_paid (boolean),
estimate_invoice_id, final_invoice_id,
notes, started_at, completed_at,
created_at, updated_at
```

### `lab_orders`
```sql
id, clinic_id, branch_id, patient_id,
treatment_plan_id, appointment_id,
ordering_dentist_id, fitting_specialist_id,
lab_order_number (auto: LAB-YYYY-NNNN),
order_type (crown|bridge|denture|aligner|veneer|implant_crown|other),
material (zirconia|pfm|acrylic|composite|other),
tooth_numbers (json array),
instructions (text),
status (pending|sent_to_lab|in_progress|ready|delivered|cancelled),
expected_ready_date (date),
actual_ready_date (date nullable),
fitting_appointment_id (nullable, set when status=ready),
notes, created_at, updated_at
```

### Alter `appointments`
```sql
ADD appointment_kind ENUM('service','treatment','emergency') DEFAULT 'service'
ADD treatment_plan_id INT nullable FK treatment_plans.id
ADD session_number INT nullable (which session of plan this is)
ADD is_emergency_bypass BOOLEAN DEFAULT false
```

### Alter `services`
```sql
ADD specialist_category VARCHAR(50) nullable
  (maps to staff.specialization for auto-assignment)
ADD requires_lab BOOLEAN DEFAULT false
ADD is_gp_service BOOLEAN DEFAULT false
  (if true, assigns to GP regardless of specialization)
```

## Auto-Assignment Algorithm

```php
class AppointmentAutoAssigner
{
    public function assign(
        int $clinicId,
        int $branchId, 
        string $kind,           // service|treatment|emergency
        ?int $serviceId = null,
        Carbon $preferredTime
    ): AssignmentResult {

        if ($kind === 'treatment' || $kind === 'emergency') {
            // Find a free GP
            return $this->findFreeGP($clinicId, $branchId, $preferredTime);
        }

        // Service — match specialist category
        $service = Service::find($serviceId);
        $category = $service->specialist_category;

        if ($service->is_gp_service || !$category) {
            return $this->findFreeGP($clinicId, $branchId, $preferredTime);
        }

        return $this->findFreeSpecialist(
            $clinicId, $branchId, $category, $preferredTime
        ) ?? $this->findFreeGP($clinicId, $branchId, $preferredTime);
    }

    private function findFreeGP(...): AssignmentResult {
        // Staff where specialization = 'General Dentistry' OR is_gp = true
        // with fewest today's appointments
        // with a free slot at preferred time
    }

    private function findFreeSpecialist(
        $clinicId, $branchId, $category, $time
    ): ?AssignmentResult {
        // Staff where specialization = $category
        // available, has free slot
        // fewest appointments today = least busy
    }
}
```

## Billing Flow Design

```
Booking (Service)         Booking (Treatment)
       ↓                         ↓
 Invoice created          No invoice yet
 (type=service,           GP examines
  status=estimated)              ↓
       ↓                  GP creates TreatmentPlan
 Patient pays                    ↓
       ↓                  Invoice::createEstimate()
 Accountant locks               ↓
       ↓                  type=treatment_estimate
 Treatment done                 ↓
       ↓                  Accountant reviews
 Final invoice             (adjust/discount/insurance)
                                ↓
                          Patient pays deposit
                                ↓
                          Treatment unlocked
```

## Lab Order State Machine

```
pending ──→ sent_to_lab ──→ in_progress ──→ ready
                                              ↓
                               Auto-schedule fitting appointment
                                              ↓
                                          delivered
```

When lab status changes to `ready`:
- Fire `LabOrderReady` event
- Listener `ScheduleFittingAppointment` runs
- Finds free slot for `fitting_specialist_id`
- Creates appointment linked to lab order
- Notifies specialist and patient

## New Events

```php
LabOrderReady($labOrder)
TreatmentPlanCreated($plan, $appointment)
DepositPaid($invoice, $plan)
TreatmentPlanCompleted($plan, $finalInvoice)
```

## New Listeners

```php
// On LabOrderReady
ScheduleFittingAppointment → auto-schedules specialist appointment

// On DepositPaid  
UnlockTreatmentAppointments → creates pending specialist appointments

// On TreatmentPlanCompleted
GenerateFinalInvoice → reconciles estimate vs actual
ScheduleRecallAppointment → creates recall
```

## API Endpoints (New/Modified)

### Booking
```
POST /api/v1/receptionist/appointments
  Body: { kind: 'service'|'treatment'|'emergency', service_id?, notes }
  → auto-assigns dentist, returns assignment info
  
POST /api/v1/receptionist/appointments/auto-assign-preview
  → returns who would be assigned without creating
```

### Treatment Plans
```
POST /api/v1/dentist/treatment-plans
  Body: { appointment_id, diagnosis, procedures[], requires_lab, specialist_type }

GET  /api/v1/dentist/treatment-plans/{id}
PUT  /api/v1/dentist/treatment-plans/{id}
POST /api/v1/dentist/treatment-plans/{id}/complete
```

### Lab Orders
```
POST /api/v1/dentist/lab-orders
  Body: { treatment_plan_id, order_type, material, tooth_numbers, instructions, expected_ready_date }
  
GET  /api/v1/manager/lab-orders          (branch manager sees all lab orders)
PUT  /api/v1/manager/lab-orders/{id}/status
  Body: { status: 'sent_to_lab'|'in_progress'|'ready'|'delivered' }
```

### Billing Estimate
```
GET  /api/v1/accountant/invoices/estimates    (new filter for estimate type)
POST /api/v1/accountant/invoices/{id}/approve-estimate
  → marks deposit required, notifies patient
```

## Frontend Changes

### AppointmentRegistrationModal
- Add `Kind` selector at top: `Service | Treatment | Emergency`
- When `Service`: show service picker → dentist auto-filled (read-only)
- When `Treatment`: show complaint text → dentist auto-filled (GP)
- When `Emergency`: minimal form → assign immediately

### New: TreatmentPlanModal (Dentist)
- Appears after GP opens an in-progress appointment
- Diagnosis field
- Add procedure buttons (from service catalogue)
- "Requires Lab" toggle → shows lab details form
- "Refer to Specialist" toggle → shows specialist type picker
- "Create Estimate" button → generates billing estimate

### New: LabOrdersPage (Manager)
- Table of all lab orders with status
- Status update buttons
- When marked "Ready" → fitting appointment created

### Accountant: Estimate Review Queue
- Filter invoices by `invoice_type = treatment_estimate`
- Show GP's treatment plan summary
- Approve/adjust/discount
- Record deposit payment

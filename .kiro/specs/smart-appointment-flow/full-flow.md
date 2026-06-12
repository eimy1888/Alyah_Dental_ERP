# DentFlow Pro — Complete Patient Journey (All Paths)

## STAGE 1: ARRIVAL & REGISTRATION

```
PATIENT ARRIVES AT CLINIC
        │
        ▼
Is patient registered?
   ├── YES → verify active card
   └── NO  → REGISTER:
              name, phone, DOB, gender, medical history
              → auto-create portal user account
              → generate CLINIC CARD INVOICE (fixed fee)
              → patient pays card fee NOW
              → card ACTIVATED after payment
              → patient gets card number
        │
        ▼
PATIENT HAS ACTIVE CARD → proceed to booking
```

## STAGE 2: BOOKING TYPE

```
RECEPTIONIST: What does the patient need?
        │
   ┌────┴──────────────┬──────────────────┐
   │                   │                  │
SERVICE            TREATMENT          EMERGENCY
(known need,      (has a problem,    (acute pain,
 fixed price)      unknown cost)      trauma)
   │                   │                  │
[Path A]           [Path B]           [Path C]
```

## PATH A — SERVICE BOOKING

```
Patient wants a specific service (Cleaning, Whitening, X-Ray, etc.)
        │
        ▼
RECEPTIONIST selects service from catalogue
→ price shown immediately (fixed)
→ duration auto-filled from service
        │
        ▼
SYSTEM AUTO-ASSIGNS SPECIALIST
→ staff.specialization = service.category
→ is_available=true, has free slot
→ least-busy specialist picked
→ fallback: assign GP if no specialist free
        │
        ▼
APPOINTMENT CONFIRMED (status=confirmed)
→ specialist + patient notified
        │
        ▼
PATIENT ARRIVES → RECEPTIONIST CHECK-IN
→ status = checked_in → added to specialist queue
        │
        ▼
SPECIALIST CALLS PATIENT (status = in_progress)
→ does checkup / examination for booked service
        │
        ▼
SPECIALIST ADDS FINDINGS
   ├── Nothing extra → service as-is
   ├── ADD EXTRA SERVICE → new invoice line added live
   │   (e.g. booked cleaning, found cavity → add filling)
   └── ADD TREATMENT → creates treatment episode
       (e.g. needs root canal → creates treatment plan)
        │
        ▼
SPECIALIST CLICKS "COMPLETE CHECKUP"
→ invoice FINALIZED with all items
→ if nothing extra: invoice = original service price
→ if extras added: invoice = service + extras
→ lifecycle_status = under_review → sent to accountant
        │
        ▼
ACCOUNTANT REVIEWS
→ apply discount / insurance if applicable
→ APPROVE & LOCK invoice
→ patient notified of final amount
        │
        ▼
PATIENT PAYS (full amount, at ACCOUNTANT)
→ receptionist records payment
→ invoice status = paid
        │
        ▼
CASE CLOSED
→ if treatment was added → continues to Path B from
  STAGE 4 (Treatment Plan already created by specialist)
→ if service only → recall scheduled → done
```

## PATH B — TREATMENT BOOKING

```
Patient has a problem (toothache, swelling, broken tooth, disease)
        │
        ▼
RECEPTIONIST books TRIAGE appointment
→ appointment_kind = treatment
→ SYSTEM AUTO-ASSIGNS FREE GP
  (specialization = General Dentistry, least busy)
        │
        ▼
PATIENT ARRIVES → RECEPTIONIST CHECK-IN
→ status = checked_in → added to GP queue
        │
        ▼
GP CALLS PATIENT (status = in_progress)
        │
        ▼
GP EXAMINES PATIENT
        │
        ▼
DIAGNOSTIC TESTS NEEDED?
   ├── YES → GP orders test (X-ray, blood, scan)
   │         → test is a Service (category=Diagnostics)
   │         → IMMEDIATE invoice line item created
   │         → patient pays for test NOW at front desk
   │         → LAB TECHNICIAN performs test
   │             ├── X-ray → image uploaded to XRay model
   │             └── Blood/swab → result text in ClinicalNote
   │         → GP reviews results
   └── NO  → GP proceeds with examination
        │
        ▼
GP MAKES DIAGNOSIS
        │
        ▼
REFERRAL NEEDED?
   ├── YES → GP selects specialist type needed
   │         (orthodontist / oral surgeon / pediatric / etc.)
   │         → noted in treatment plan as referral
   └── NO  → GP handles treatment directly
        │
        ▼
GP CREATES TREATMENT PLAN
→ diagnosis text
→ list of procedures needed (from service catalogue)
→ estimated sessions
→ fabrication lab required? (crown/bridge/denture?)
→ referral to specialist? which type?
→ urgency level
        │
        ▼
TREATMENT ESTIMATE INVOICE AUTO-GENERATED
→ planned procedure fees + lab fee (if any)
→ diagnostics NOT included (already paid)
→ invoice_type = treatment_estimate
→ lifecycle_status = estimated
→ sent to ACCOUNTANT queue
```

## PATH C — EMERGENCY BOOKING

```
Severe pain / trauma / accident / post-op complication
        │
        ▼
RECEPTIONIST marks appointment_kind = emergency
→ is_emergency_bypass = true
→ SKIP clinic card check
→ SKIP payment gate
→ SYSTEM assigns first available dentist (GP or specialist)
        │
        ▼
PATIENT GOES IN IMMEDIATELY (no waiting)
→ treatment proceeds same as Path B from GP examination
→ invoice created AFTER treatment
→ flagged emergency_bypass=true in accountant queue
```

## STAGE 3: PAYMENT GATE (Treatment Path)

```
ACCOUNTANT RECEIVES TREATMENT ESTIMATE
        │
        ▼
ACCOUNTANT REVIEWS
→ adjust line items if needed
→ apply discount
→ apply insurance coverage
→ APPROVE estimate
→ patient notified of total + deposit required
        │
        ▼
PAYMENT OPTIONS:
   ├── EMERGENCY (bypass) → skip, treat now, pay after
   ├── DEPOSIT (30-100%) → patient pays partial
   │   → accountant records deposit
   │   → invoice status = partial
   │   → TREATMENT UNLOCKED
   └── FULL PAYMENT → patient pays 100%
       → invoice status = paid
       → TREATMENT UNLOCKED
        │
        ▼
TREATMENT APPOINTMENTS AUTO-SCHEDULED
→ if referral: system finds free slot for specialist type
→ if GP treats: next available GP slot
→ appointments created, notifications sent
```

## STAGE 4: TREATMENT SESSIONS

```
PATIENT ARRIVES FOR TREATMENT SESSION
        │
        ▼
RECEPTIONIST CHECK-IN → queue
        │
        ▼
SPECIALIST/DENTIST TREATS
→ adds procedures performed
→ each procedure updates invoice in real-time
→ BillingCalculatorService computes pricing
        │
        ▼
MORE SESSIONS NEEDED?
   ├── YES → schedule next session (same treatment_plan_id)
   │         session_number++
   └── NO  → continue
        │
        ▼
FAB LAB NEEDED?
   ├── YES → [STAGE 5: LAB WORKFLOW]
   └── NO  → [STAGE 6: CASE CLOSURE]
```

## STAGE 5: LAB TECHNICIAN WORKFLOW

```
GP/SPECIALIST DOES PREP WORK
(impression, mold, scan)
        │
        ▼
LAB ORDER CREATED by dentist
→ order_type: crown/bridge/denture/aligner/veneer
→ material: zirconia/PFM/acrylic
→ tooth_numbers, instructions
→ expected_ready_date
→ fitting_specialist_id
→ status = pending
        │
        ▼
LAB TECHNICIAN DASHBOARD
─────────────────────────────────────────
│  PENDING ORDERS    │  IN PROGRESS  │
│  ┌─────────────┐   │  ┌──────────┐ │
│  │ Crown #L001 │   │  │Bridge   │ │
│  │ Patient: X  │   │  │#L002    │ │
│  │ Due: Jun 15 │   │  └──────────┘ │
│  └─────────────┘   │               │
─────────────────────────────────────────
        │
        ▼
LAB TECH UPDATES STATUS:
pending → sent_to_lab → in_progress → ready → delivered
        │
        ▼
LAB MARKS "READY"
→ LabOrderReady EVENT fired
→ SYSTEM AUTO-SCHEDULES FITTING APPOINTMENT
  → finds free slot for fitting_specialist
  → appointment linked to lab_order_id
  → specialist notified: "Lab order ready — fitting scheduled"
  → patient notified: "[Crown] ready, appointment [date]"
        │
        ▼
FITTING APPOINTMENT
→ specialist fits prosthetic
→ marks lab order = delivered
→ continues to STAGE 6
```

## STAGE 6: CASE CLOSURE

```
ALL SESSIONS + LAB FITTING DONE
        │
        ▼
DENTIST/SPECIALIST MARKS TREATMENT PLAN = COMPLETED
        │
        ▼
SYSTEM GENERATES FINAL INVOICE
→ actual procedures performed vs estimate
   ├── Actual > Estimate → patient pays difference
   └── Actual < Estimate → clinic issues credit/refund
        │
        ▼
ACCOUNTANT REVIEWS FINAL INVOICE
→ locks invoice
→ records final payment
        │
        ▼
PATIENT PAYS REMAINING BALANCE
        │
        ▼
RECALL AUTOMATICALLY SCHEDULED
→ interval: 3 / 6 / 12 months (clinic configurable)
→ patient notified 2 weeks before recall date
        │
        ▼
CASE CLOSED ✓
        │
        ▼
PATIENT RETURNS FOR RECALL
→ treated as new Service booking
→ if new problem found → new Treatment booking
→ cycle repeats
```

## LAB TECHNICIAN DASHBOARD — FULL SPEC

### Role
- `role = lab_technician`
- Belongs to a `clinic_id` and optionally `branch_id`
- Can see all lab orders for their clinic/branch
- Cannot see patient billing or appointments (privacy separation)

### Dashboard Pages

**`/lab/dashboard`** — KPI overview
- Total pending orders
- Orders due today / overdue
- Orders in progress
- Orders completed this week

**`/lab/orders`** — Orders list
- Filter by: status / order_type / due_date / dentist
- Columns: order_number, patient_name, order_type, material, tooth_numbers, due_date, dentist, status
- Actions: View details / Update status / Upload result

**`/lab/orders/{id}`** — Order detail
- Full instructions from dentist
- Material spec
- Tooth diagram (visual)
- Status update buttons
- Notes field
- Upload result file (for digital files, scans)

### Status Buttons on Each Order

| Current Status | Available Actions |
|---|---|
| pending | "Mark Received" → sent_to_lab |
| sent_to_lab | "Start Work" → in_progress |
| in_progress | "Mark Ready" → ready |
| ready | (auto-scheduled by system) |
| delivered | View only |

### API Routes (new `lab` prefix)

```php
// routes/api/v1/lab.php
Route::middleware(['cookie.auth'])->prefix('lab')->group(function () {
    Route::get('dashboard',              [LabDashboardController::class, 'index']);
    Route::get('orders',                 [LabOrderController::class, 'index']);
    Route::get('orders/{id}',            [LabOrderController::class, 'show']);
    Route::put('orders/{id}/status',     [LabOrderController::class, 'updateStatus']);
    Route::post('orders/{id}/notes',     [LabOrderController::class, 'addNote']);
    Route::get('notifications/count',    [LabNotificationController::class, 'count']);
    Route::get('notifications',          [LabNotificationController::class, 'index']);
    Route::get('settings/profile',       [LabSettingsController::class, 'getProfile']);
    Route::put('settings/profile',       [LabSettingsController::class, 'updateProfile']);
    Route::post('settings/change-password', [LabSettingsController::class, 'changePassword']);
});
```

## COMPLETE ACTOR RESPONSIBILITY TABLE

| Stage | Receptionist | GP | Specialist | Lab Tech | Accountant | Patient | System |
|---|---|---|---|---|---|---|---|
| Register | ✅ registers | | | | | provides info | creates portal |
| Card fee | ✅ records | | | | ✅ confirms | ✅ pays | activates card |
| Booking | ✅ books | | | | | | auto-assigns dentist |
| Check-in | ✅ checks in | | | | | arrives | adds to queue |
| GP exam | | ✅ examines | | | | attends | |
| Diagnostic test order | ✅ bills/collects | ✅ orders | | ✅ performs test | | ✅ pays | creates invoice line |
| Diagnostic result | | ✅ reviews | | ✅ uploads | | | stores in record |
| Service checkup | | | ✅ examines | | | attends | |
| Add extra items | | ✅ or | ✅ adds | | | | updates invoice live |
| Complete checkup | | ✅ or | ✅ clicks | | | | finalizes invoice |
| Treatment plan | | ✅ creates | | | | | generates estimate |
| Estimate review | | | | | ✅ reviews/adjusts | | sends to patient |
| Deposit/payment | ✅ records | | | | ✅ confirms | ✅ pays | unlocks treatment |
| Auto-schedule | | | gets notified | | | gets notified | ✅ creates appointment |
| Treatment session | ✅ check-in | | ✅ treats | | | attends | updates invoice live |
| Lab order | | ✅ creates | ✅ creates | | | | |
| Lab work | | | | ✅ works | | | tracks status |
| Lab ready | | | gets notified | ✅ marks ready | | gets notified | ✅ auto-schedules fitting |
| Fitting | | | ✅ fits | ✅ delivers | | attends | marks delivered |
| Final invoice | | | | | ✅ locks | ✅ pays balance | reconciles |
| Recall | | | | | | gets reminder | ✅ auto-schedules |

# Smart Appointment Flow — Requirements

## Overview
A complete end-to-end dental clinic workflow covering triage, GP consultation,
treatment planning, lab work, billing gates, specialist assignment, and case closure.
Designed for Ethiopian dental clinics using DentFlow Pro.

---

## Actors
- **Patient** — visits clinic, pays, receives treatment
- **Receptionist / Manager** — registers patients, books appointments
- **GP (General Dentist)** — does initial exam, creates treatment plan, orders labs
- **Specialist** — executes specific treatments (orthodontist, oral surgeon, etc.)
- **Accountant** — reviews invoices, approves payment, gates treatment
- **Lab Technician** (external or internal) — processes lab orders

---

## Requirements

### REQ-1: Booking Type Selection
When booking an appointment, the system must distinguish between:

- **Service booking** — patient wants a specific, fixed-price service
  (e.g. Teeth Whitening, Cleaning, X-Ray)
  - Price is known upfront
  - System auto-assigns a free specialist matching the service category
  - No GP triage needed
  - Billing invoice created at booking

- **Treatment booking** — patient has a problem/symptom
  (e.g. toothache, broken tooth, accident, disease)
  - Price is NOT known upfront
  - System auto-assigns a free GP (General Dentist)
  - GP examines first, then creates treatment plan
  - Billing estimate created AFTER GP exam

- **Emergency booking** — urgent pain or trauma
  - Bypasses payment gate
  - Assigned to first available dentist (GP or specialist)
  - Billing created after treatment

### REQ-2: Auto-Assignment Logic
When a service booking is made:
- Find all staff with `specialization` matching the service `category`
- Filter by `is_available = true` and has a free slot in today's schedule
- Assign to the dentist with the fewest appointments today (least busy)
- If no specialist is free, assign to GP with note "Referred to specialist pending"

When a treatment booking is made:
- Find all GPs (`specialization = 'General Dentistry'` or role-based)
- Filter by `is_available = true`
- Assign to the GP with the fewest appointments today

### REQ-3: GP Examination & Treatment Plan
After GP sees patient (`status = in_progress`):
- GP can add procedures to the appointment
- GP creates a **Treatment Plan** with:
  - Problem diagnosis (text)
  - List of required treatments (from service catalogue)
  - Estimated sessions (1 to N)
  - Lab work required? (yes/no)
  - Referral to specialist? (yes/no, with specialist type)
- Treatment plan becomes the basis for the billing estimate

### REQ-4: Billing Estimate (Before Treatment)
After GP creates treatment plan:
- System auto-generates a **Treatment Estimate Invoice** containing:
  - GP consultation fee
  - All planned procedure fees (from service prices)
  - Lab fee (if lab work required)
  - Tax (configurable per clinic, default 15%)
- Invoice lifecycle status = `estimated`
- Sent to accountant for review
- Patient must pay **deposit** (configurable: 30%–100%) before treatment starts

### REQ-5: Deposit & Payment Gate
- Accountant sees estimate invoice in review queue
- Accountant can:
  - Apply discount
  - Apply insurance coverage
  - Adjust line items
  - Mark as approved
- Patient pays deposit (cash/Telebirr/bank)
- When deposit recorded:
  - Invoice status = `partial`
  - Treatment appointments are **unlocked** and auto-scheduled
  - Specialist notified via in-app notification

### REQ-6: Emergency Bypass
When `appointment_type = emergency`:
- Skip payment gate entirely
- Treatment proceeds immediately
- Invoice created after treatment with `emergency_bypass = true`
- Accountant sees these flagged separately in review queue

### REQ-7A: Diagnostic Tests (During Examination)
During the GP examination, the GP may need diagnostic tests to make a diagnosis.
These are **immediate, fixed-price services** billed on the spot.

**Examples:**
- Dental X-Ray (periapical, bitewing)
- Panoramic X-Ray (full mouth)
- CBCT scan (3D)
- Blood test (for surgery clearance)
- Swab / culture test
- Pulp vitality test

**Rules:**
- GP orders diagnostic tests from within the examination screen
- Each test is a `Service` with `category = 'Diagnostics'` and `is_diagnostic = true`
- Ordering a diagnostic test creates an **immediate invoice line item**
- Billed at time of ordering — separate from the treatment estimate
- Patient pays for diagnostics **at the front desk before or during the exam**
- Results are uploaded/recorded in the patient's medical record (existing XRay model for imaging)
- GP can view results before finalizing diagnosis
- Diagnostic costs are NOT included in the treatment estimate (already paid)

**Diagnostic test workflow:**
```
GP opens in-progress appointment
      ↓
GP clicks "Order Diagnostic Test"
      ↓
Selects test from catalogue (X-ray, blood, etc.)
      ↓
System adds line item to consultation invoice (immediate billing)
      ↓
Receptionist/technician performs the test
      ↓
Results uploaded to patient record
(image file for X-ray, text for blood/swab)
      ↓
GP reviews results
      ↓
GP proceeds to diagnosis and treatment plan
```

**Data:**
- Diagnostic orders stored as `Procedure` records with `procedure_type = 'diagnostic'`
- X-ray images stored in existing `XRay` model
- Text results stored as `ClinicalNote` with `note_type = 'lab_result'`
- Diagnostic invoice separate from treatment estimate

### REQ-7B: Fabrication Lab Order (After Treatment Prep)
When GP marks treatment plan as requiring lab work:
- System creates a **Lab Order** record with:
  - `lab_order_number` (auto-generated)
  - `patient_id`, `clinic_id`, `branch_id`
  - `order_type` (crown, bridge, denture, aligner, other)
  - `dentist_id` (ordering GP)
  - `specialist_id` (who will do the fitting)
  - `instructions` (text)
  - `expected_ready_date`
  - `status` (pending → sent_to_lab → in_progress → ready → delivered → cancelled)
  - `material` (zirconia, PFM, acrylic, etc.)

Lab order lifecycle:
```
GP creates order after prep (pending)
      ↓
Lab receives (sent_to_lab)
      ↓
Lab working (in_progress)
      ↓
Lab marks ready (ready)
      ↓
System auto-schedules FITTING appointment with specialist
      ↓
Specialist fits (delivered)
```

### REQ-8: Specialist Appointment After Payment
Once payment gate is passed (deposit paid + accountant approved):
- For referrals to specialists:
  - System finds first free slot for the required specialist type
  - Auto-creates appointment with `created_by = system`
  - Patient and specialist both notified
- For lab-dependent treatments:
  - Appointment is scheduled ONLY when lab marks order as `ready`
  - Prevents scheduling before lab work is done

### REQ-9: Multi-Session Treatment Plans
A treatment plan can span multiple appointments:
- Each session is a separate appointment linked to the same `treatment_plan_id`
- Each session adds procedures to the same or new episodes
- Billing accumulates across sessions
- Final invoice is generated when GP marks plan as `completed`

### REQ-10: Case Closure & Recall
When treatment plan is marked `completed`:
- All episodes finalized
- Final invoice generated (actual cost, may differ from estimate)
- If final > estimate: patient pays difference
- If final < estimate: refund or credit note
- Automatic **Recall appointment** scheduled (configurable: 3/6/12 months)
- Patient notified of recall date

---

## Booking Flow Summary

```
PATIENT ARRIVES
      ↓
Receptionist registers (clinic card fee paid)
      ↓
WHAT TYPE?
  ├── Service → auto-assign specialist → CONFIRM → Notify
  ├── Treatment → auto-assign GP → TRIAGE
  └── Emergency → auto-assign any free dentist → TREAT NOW
              ↓ (Treatment path)
         GP EXAMINES
              ↓
    Diagnostic tests needed?
     ├── YES → GP orders: X-ray / Blood test / Scan
     │         Billed immediately (fixed price, paid now)
     │         Test performed → Results uploaded
     │         GP reviews results
     └── NO  → proceeds
              ↓
         GP makes DIAGNOSIS
         (informed by test results if ordered)
              ↓
         GP creates TREATMENT PLAN
         (procedures needed, sessions, fab-lab?, referral?)
              ↓
         TREATMENT ESTIMATE auto-generated
         (upcoming procedures + fab-lab fee)
         [diagnostics already paid — NOT included]
              ↓
         ACCOUNTANT REVIEWS
         (discount, insurance, approve)
              ↓
         PATIENT PAYS DEPOSIT
              ↓
         TREATMENT UNLOCKED
              ↓
    Fabrication lab required?
     ├── YES → GP does PREP (impression/mold)
     │         Fabrication Lab Order sent
     │            ↓
     │         Lab works (days/weeks)
     │            ↓
     │         Lab marks READY
     │            ↓
     │         Specialist appointment AUTO-SCHEDULED
     │            ↓
     │         Specialist FITS
     └── NO → Specialist/GP appointment AUTO-SCHEDULED
                  ↓
             Treatment performed
              ↓
         Sessions done → GP marks PLAN COMPLETE
              ↓
         FINAL INVOICE (actual cost)
              ↓
         Patient pays BALANCE
              ↓
         RECALL scheduled
              ↓
         CASE CLOSED
```

---

## Data Models Needed

| Model | Status | Notes |
|---|---|---|
| `Appointment` | ✅ exists | Add `appointment_kind`, `treatment_plan_id` |
| `TreatmentPlan` | ❌ new | Core new model |
| `LabOrder` | ❌ new | Fabrication lab workflow |
| `Invoice` | ✅ exists | Extend with `invoice_type = treatment_estimate` |
| `Service` | ✅ exists | Add `specialist_category`, `is_diagnostic`, `requires_lab` |
| `Staff` | ✅ exists | Add `is_gp` flag |
| `Recall` | ✅ exists | Already in codebase |
| `Procedure` | ✅ exists | Add `procedure_type` (treatment/diagnostic) |
| `XRay` | ✅ exists | Used for diagnostic imaging results |
| `ClinicalNote` | ✅ exists | Add `note_type = 'lab_result'` for blood/swab results |
| `TreatmentEpisode` | ✅ exists | Link to TreatmentPlan |

## Two Types of Lab — Summary

| | Diagnostic Lab | Fabrication Lab |
|---|---|---|
| **When** | During GP exam | After treatment prep |
| **Purpose** | Diagnose the problem | Make a dental prosthetic |
| **Examples** | X-ray, blood test, CT scan | Crown, denture, bridge |
| **Billing** | Immediate, fixed price, paid on spot | Part of treatment estimate |
| **Duration** | Same day (X-ray) or 1–2 days | Days to weeks |
| **Model** | `Procedure` (diagnostic) + `XRay`/`ClinicalNote` | `LabOrder` |
| **Blocks treatment?** | YES — GP needs results before diagnosing | YES — fitting can't happen until ready |

---

## Priority Order for Implementation

1. **REQ-1 + REQ-2** — Booking type + auto-assign (highest impact, user-facing)
2. **REQ-4 + REQ-5** — Billing estimate + payment gate (revenue protection)
3. **REQ-6** — Emergency bypass (patient safety)
4. **REQ-3** — Treatment plan model (GP workflow)
5. **REQ-7** — Lab orders (operational)
6. **REQ-8** — Specialist auto-scheduling (automation)
7. **REQ-9** — Multi-session (advanced)
8. **REQ-10** — Case closure + recall (completion)

# Requirements Document

> **Feature:** Simple Billing Flow — DentFlow Pro · Ethiopian Dental Clinic Model

---

## Introduction

DentFlow Pro's existing billing system uses a multi-stage invoice lifecycle
(draft → estimated → in_progress → under_review → locked → partial → paid)
which is too complex for real-world Ethiopian dental clinics that operate
on a simple **cash-before-treatment** model.

This spec refactors the entire billing and treatment-activation workflow into
a model that matches how Ethiopian private dental clinics actually work:

- One invoice per case, generated after checkup, updated until fully paid, then locked.
- Normal patients pay 100% before any treatment starts.
- Emergency patients receive treatment first and pay before discharge.
- Lab fees are inside the single invoice — no separate lab billing.
- Specialist assignment, lab order creation, and recall scheduling are all automatic.
- The accountant records payments and views reports — no approval workflow gates.

**Confirmed answers (from clinic owner Q&A):**
| # | Question | Answer |
|---|---|---|
| 1 | Card fee applies? | Always for new patients |
| 2 | Default card fee | ETB 200 |
| 3 | Card expiry | None — valid forever |
| 4 | Walk-in patients | Same checkup→invoice→pay→treat flow |
| 5 | Who collects payment | Accountant |
| 6 | Wait time after checkup | Queue-dependent, no fixed limit |
| 7 | Lab fee type | Varies by procedure (crown, bridge, denture…) |
| 8 | Specialist booking | Auto-book immediately |
| 9 | Diagnostic + treatment same day | Yes, allowed |
| 10 | Add-service during treatment | Doctor pauses at chairside |
| 11 | Emergency decision | Receptionist OR doctor |
| 12 | Emergency non-payment | Flagged as debt + audit note |
| 13 | Start after payment | Same day if available, else next slot |
| 14 | Specialist fully booked | System auto-books next date |
| 15 | Lab ready → fitting | Auto-booked immediately |
| 16 | Recall interval | Per treatment type |
| 17 | Accountant role | Records payments + views reports |
| 18 | Undo checkup complete | Not allowed once invoice starts |
| 19 | Multi-session invoice | One invoice for full plan |
| 20 | Emergency non-payment | Patient flagged as debt |

---

## Glossary

| Term | Definition |
|---|---|
| **Treatment_Invoice** | The single invoice generated per patient case after CHECKUP COMPLETE. Contains all procedures, lab fees, and medications for the entire treatment plan. |
| **Card_Invoice** | One-time fixed-fee invoice (ETB 200) for new patient registration. Generated once per patient lifetime. |
| **Diagnostic_Invoice** | Immediate fixed-price invoice generated when a GP orders a test (X-ray, blood, scan) during examination. Separate from the Treatment_Invoice. |
| **UNPAID** | Invoice state: balance not yet received. Treatment is blocked. |
| **PAID** | Invoice state: full balance received. Treatment is unlocked. Auto-triggers lab orders, specialist appointments, and recall scheduling. |
| **LOCKED** | Invoice state: set after PAID for audit immutability. No further changes permitted. |
| **Payment_Gate** | System enforcement that blocks treatment, lab orders, and referrals until Treatment_Invoice is PAID. |
| **Checkup** | Initial examination by a GP or specialist. Ends when doctor clicks "CHECKUP COMPLETE". |
| **CHECKUP COMPLETE** | Doctor action that finalizes the examination, generates the Treatment_Invoice, and determines whether GP treats or specialist is needed. Cannot be undone after invoice generation. |
| **Auto_Assignment** | System process selecting the best available dentist based on service type, specialization, availability today, and queue load. |
| **Lab_Order** | Fabrication request (crown, bridge, denture, aligner). Created automatically after Treatment_Invoice is PAID. Fee included in Treatment_Invoice. |
| **Fitting_Appointment** | Auto-created appointment when a Lab_Order status becomes `ready`. |
| **Add_Service** | Doctor action during treatment that appends a new procedure to the existing Treatment_Invoice. Temporarily returns invoice to UNPAID if extra payment is needed. |
| **Emergency_Bypass** | Flag on an appointment that skips the Payment_Gate and allows immediate treatment. Invoice generated after treatment. |
| **Debt_Flag** | A flag placed on an emergency patient's record when they cannot pay before discharge. Visible to receptionist and accountant. |
| **Recall** | Auto-scheduled follow-up appointment after treatment completion. Interval varies per treatment type. |
| **GP** | General Practitioner dentist. Handles examination and treats cases within general dentistry scope. |
| **Specialist** | Dentist with a specific specialisation (Endodontist, Orthodontist, Oral Surgeon, Prosthodontist). Handles complex cases. |
| **Accountant** | Staff role that records payments and views financial reports. Does NOT gate treatment by approving invoices. |
| **Receptionist** | Staff role that registers patients, books appointments, and manages check-in. Can also mark emergency. |

---

## Requirements

---

### REQ-1 — Simplified Invoice Lifecycle (Three States Only)

**User Story:** As a clinic manager, I want invoices to have only three
states — UNPAID, PAID, LOCKED — so that staff are never confused by
billing stages that don't exist in real clinic operations.

**Acceptance Criteria:**

1. THE system SHALL support exactly three invoice lifecycle states: `UNPAID`, `PAID`, `LOCKED`.
2. WHEN any invoice is created, THE system SHALL set its initial state to `UNPAID`.
3. WHEN the full invoice balance is recorded as paid, THE system SHALL transition the invoice from `UNPAID` to `PAID` automatically.
4. WHEN an invoice reaches `PAID` state, THE system SHALL transition it to `LOCKED` within 24 hours for permanent audit immutability.
5. IF an invoice is in `PAID` or `LOCKED` state, THEN THE system SHALL reject any attempt to add, remove, or modify line items and SHALL return HTTP 422 with message "Invoice is immutable after payment".
6. THE system SHALL NOT set any of the following states on any new invoice created after this spec is deployed: `draft`, `estimated`, `in_progress`, `updated`, `final`, `under_review`, `partial`, `overdue`.
7. THE system SHALL preserve existing historical invoices carrying legacy states as read-only for audit access.
8. THE system SHALL NOT require accountant approval as a gate before treatment is allowed to start.

---

### REQ-2 — Single Treatment Invoice Per Case

**User Story:** As a dentist, I want one invoice to cover the entire
treatment plan so that patients receive one clear bill and nothing is
missed or double-billed.

**Acceptance Criteria:**

1. THE system SHALL generate exactly one Treatment_Invoice per patient case.
2. WHEN a multi-session treatment plan exists, THE system SHALL add all sessions to the same Treatment_Invoice rather than generating one invoice per session.
3. THE system SHALL allow line items to be added to a Treatment_Invoice only while its state is `UNPAID`.
4. WHEN a line item is added while the Treatment_Invoice is `UNPAID`, THE system SHALL recalculate the total in real time within 1 second.
5. IF a Treatment_Invoice already exists for a case in `PAID` or `LOCKED` state, THEN THE system SHALL reject any request to add line items and SHALL return HTTP 422.
6. THE system SHALL NOT generate separate estimate invoices, deposit invoices, or phase invoices for a single treatment case.
7. THE system SHALL display the Treatment_Invoice on the dentist screen as a live-updating document while it is in `UNPAID` state.

---

### REQ-3 — 100% Pre-Payment for Normal Cases

**User Story:** As a clinic owner, I want the system to block all treatment
actions until the invoice is fully paid so that the clinic never performs
unpaid treatment on scheduled patients.

**Acceptance Criteria:**

1. THE system SHALL require Treatment_Invoice state = `PAID` before any of the following actions are permitted: starting a treatment session, creating a Lab_Order, and executing a specialist referral appointment.
2. WHEN a Treatment_Invoice exists and its state is `UNPAID`, THE system SHALL display a "PAYMENT REQUIRED — ETB [amount]" banner on the appointment card visible to both the receptionist and the accountant.
3. THE system SHALL NOT allow a partial payment against a Treatment_Invoice. IF a payment amount submitted is less than the Treatment_Invoice balance, THEN THE system SHALL reject the payment and respond with "Full payment required: ETB [balance]".
4. THE system SHALL NOT allow deposits, advance payments, or installment plans against a Treatment_Invoice.
5. WHEN the accountant records a full payment equal to the Treatment_Invoice balance, THE system SHALL transition the invoice to `PAID` state and activate the treatment session within 2 seconds.
6. THE system SHALL apply the same 100% pre-payment rule to walk-in patients as to scheduled patients.

---

### REQ-4 — Emergency Bypass — Treatment Before Payment

**User Story:** As a dentist or receptionist, I want to mark any case as
emergency so that patients in acute pain or trauma receive immediate
treatment without waiting for payment.

**Acceptance Criteria:**

1. WHEN an appointment is created or updated with `is_emergency_bypass = true`, THE system SHALL skip the Payment_Gate and allow the dentist to start treatment immediately.
2. EITHER the receptionist OR the dentist SHALL be permitted to set `is_emergency_bypass = true` on an appointment.
3. WHILE an emergency appointment is in progress, THE system SHALL allow the dentist to add procedures to the patient record without requiring a PAID invoice.
4. WHEN the dentist marks an emergency appointment as "TREATMENT COMPLETE", THE system SHALL generate the Treatment_Invoice at that point, NOT before treatment.
5. WHEN an emergency Treatment_Invoice is generated, THE system SHALL flag it with `emergency_bypass = true` and display it with a red "EMERGENCY — PAYMENT DUE" indicator on the accountant and receptionist dashboards.
6. THE system SHALL require the emergency Treatment_Invoice to reach `PAID` state before the appointment is marked as fully discharged.
7. IF an emergency patient cannot pay before leaving (critical condition, hospital transfer), THEN THE system SHALL mark the patient record with `has_debt = true`, store an audit note with timestamp and staff name, and keep the invoice in `UNPAID` state permanently until paid.
8. A patient with `has_debt = true` SHALL be visually flagged on all future appointment and patient views until the debt is cleared by a full payment.

---

### REQ-5 — CHECKUP COMPLETE — Auto Invoice Generation

**User Story:** As a GP, I want one click on "CHECKUP COMPLETE" to
automatically generate the full treatment invoice so that I never have to
manually create billing documents after an examination.

**Acceptance Criteria:**

1. WHEN a dentist clicks "CHECKUP COMPLETE" on an in-progress appointment, THE system SHALL automatically generate the Treatment_Invoice.
2. THE system SHALL include the following line items in the auto-generated Treatment_Invoice: the primary booked service at its catalogue price, all procedures added by the dentist during the checkup session, the lab fee for the specific procedure type if the dentist indicated lab work is required (see REQ-9 for fee schedule), and any billable medications added during the checkup.
3. THE system SHALL calculate the Treatment_Invoice total as the sum of all line item prices plus the clinic's configured VAT rate (default 15%).
4. WHEN the Treatment_Invoice is generated, THE system SHALL immediately notify the receptionist and accountant with message: "Invoice [number] ready — Patient [name] — ETB [total] — Collect payment".
5. THE system SHALL generate the Treatment_Invoice within 3 seconds of the CHECKUP COMPLETE action.
6. WHEN the Treatment_Invoice is generated for an emergency appointment, THE system SHALL follow REQ-4 (invoice generated after treatment, not before).
7. IF a dentist clicks "CHECKUP COMPLETE" a second time on an appointment that already has a Treatment_Invoice, THEN THE system SHALL return the existing invoice with no duplicate created.
8. THE system SHALL NOT allow the CHECKUP COMPLETE action to be undone once the Treatment_Invoice has been generated.

---

### REQ-6 — Auto Specialist Assignment After Checkup

**User Story:** As a GP, I want the system to automatically identify and
assign the correct specialist when the required treatment is outside general
dentistry scope so that I never have to manually coordinate referrals.

**Acceptance Criteria:**

1. WHEN a dentist completes a checkup and the required procedure maps to a specialist type, THE system SHALL automatically identify the required specialist type according to the following rules:
   - Root canal → Endodontist
   - Braces / orthodontic treatment → Orthodontist
   - Surgical extraction / jaw surgery → Oral Surgeon
   - Crown, complex bridge, full-mouth prosthetic → Prosthodontist
2. WHEN the Treatment_Invoice for a specialist-referred case reaches `PAID` state, THE system SHALL immediately auto-book a specialist appointment by: finding the available specialist of the required type with the fewest confirmed appointments today, creating a confirmed appointment linked to the original case, and notifying the assigned specialist and the patient.
3. IF no specialist of the required type is available today, THEN THE system SHALL find the earliest available date across all specialists of that type and auto-book without requiring receptionist confirmation.
4. WHILE a Treatment_Invoice is `UNPAID`, THE system SHALL NOT create the specialist appointment even if the specialist has been identified.
5. WHEN Auto_Assignment creates a specialist appointment, THE system SHALL send the patient an in-app notification: "Your specialist appointment has been booked — Dr. [name] ([type]) — [date] at [time]".
6. WHEN Auto_Assignment creates a specialist appointment, THE system SHALL send the specialist an in-app notification: "New referral — Patient [name] — [treatment type] — [date] at [time]".
7. THE system SHALL record the auto-assigned specialist appointment linked to the original appointment ID for full traceability.

---

### REQ-7 — GP Self-Treatment Assignment

**User Story:** As a GP, I want the system to keep me as the treating dentist
when the required treatment is within general dentistry scope so that simple
cases don't waste specialist appointment slots.

**Acceptance Criteria:**

1. WHEN a dentist completes a checkup and the required procedure is within general dentistry scope, THE system SHALL assign the same GP as the treating dentist for the treatment session.
2. THE system SHALL classify the following as general dentistry scope: simple extraction, dental filling (composite or amalgam), scaling and cleaning, dental examination, fluoride treatment, and basic single-tooth restoration.
3. WHEN a GP-treated Treatment_Invoice reaches `PAID` state, THE system SHALL automatically schedule the next treatment session with the same GP using the GP's earliest available slot on the same day if possible, otherwise the next available date.
4. THE system SHALL send the patient an in-app notification: "Your treatment is confirmed — Dr. [name] — [date] at [time] — Please proceed to the treatment room".

---

### REQ-8 — Add Service During Active Treatment

**User Story:** As a dentist, I want to add a newly discovered procedure
to the existing invoice while the patient is in the treatment chair so
that the patient receives one accurate bill without leaving and re-queuing.

**Acceptance Criteria:**

1. WHEN a dentist clicks "ADD SERVICE" during an active treatment session, THE system SHALL append the new procedure as a line item to the existing Treatment_Invoice and recalculate the total.
2. WHEN the new line item increases the Treatment_Invoice total above the amount already paid, THE system SHALL transition the invoice state from `PAID` back to `UNPAID` for the outstanding difference.
3. WHEN the invoice returns to `UNPAID` due to an ADD SERVICE action, THE system SHALL immediately display a "ADDITIONAL PAYMENT REQUIRED — ETB [difference]" alert on the accountant screen.
4. WHEN the invoice returns to `UNPAID`, THE system SHALL block further treatment progression until the accountant records the additional payment.
5. WHEN the accountant records the additional payment and the balance reaches zero, THE system SHALL transition the invoice back to `PAID` and notify the dentist: "Payment confirmed — continue treatment".
6. THE system SHALL record a timestamped audit entry for every ADD SERVICE action including: procedure name, price added, staff who added it, and invoice state before and after.
7. THE system SHALL NOT create a new invoice for the additional service — it SHALL always update the same Treatment_Invoice.

---

### REQ-9 — Lab Order Integration Within Single Invoice

**User Story:** As a dentist, I want lab fees automatically included in the
treatment invoice and lab orders created after payment so that patients
are never surprised by a separate lab bill.

**Acceptance Criteria:**

1. WHEN a dentist indicates lab work is required during checkup, THE system SHALL include the lab fee as a line item in the Treatment_Invoice using the procedure-specific fee schedule:
   - Crown → ETB 500
   - Bridge (per unit) → ETB 500
   - Full denture → ETB 800
   - Partial denture → ETB 600
   - Aligner → ETB 1,200
   - Implant crown → ETB 700
   - (Clinic admin can override these defaults in settings)
2. THE system SHALL NOT generate a separate lab invoice or request a separate lab payment from the patient.
3. WHEN the Treatment_Invoice reaches `PAID` state and lab work is flagged, THE system SHALL automatically create a Lab_Order record with status `pending` and number format `LAB-{YEAR}-{0001}`.
4. WHILE the Treatment_Invoice is `UNPAID`, THE system SHALL NOT create any Lab_Order record for that case.
5. WHEN a lab technician marks a Lab_Order as `ready`, THE system SHALL automatically create a Fitting_Appointment by finding the earliest available slot for the designated fitting specialist and setting the appointment status to `confirmed`.
6. WHEN a Fitting_Appointment is created, THE system SHALL send the patient an in-app notification: "Your [type] is ready — Fitting with Dr. [name] on [date] at [time]".
7. WHEN a Fitting_Appointment is created, THE system SHALL send the fitting specialist an in-app notification: "Lab order [number] ready — Fitting for Patient [name] on [date] at [time]".

---

### REQ-10 — Clinic Card Invoice (New Patients Only)

**User Story:** As a receptionist, I want the system to charge a one-time
registration fee for new patients and never charge it again so that
returning patients are not annoyed by duplicate card fees.

**Acceptance Criteria:**

1. WHEN a new patient is registered in the system for the first time, THE system SHALL automatically generate a Card_Invoice for ETB 200 (plus configured VAT).
2. THE system SHALL generate a Card_Invoice exactly once per patient across their entire lifetime in the system.
3. WHEN the Card_Invoice is fully paid, THE system SHALL activate the patient's clinic card (`card_is_active = true`) and allow appointment booking.
4. IF a new patient attempts to book an appointment while their Card_Invoice is `UNPAID`, THEN THE system SHALL block the booking and display: "Card registration fee required — ETB [amount] — Please pay at the accountant desk".
5. WHEN an existing patient with `card_is_active = true` books an appointment, THE system SHALL NOT generate a new Card_Invoice.
6. THE system SHALL set Card_Invoice state to `UNPAID` at creation and transition it to `PAID` upon full payment identical to REQ-3 payment rules.
7. THE clinic card SHALL have no expiry date — once activated it remains valid for life.

---

### REQ-11 — Diagnostic Invoice (Immediate On-the-Spot)

**User Story:** As a GP, I want to order diagnostic tests that are billed
immediately and separately from the treatment invoice so that test costs
are collected before the test is run.

**Acceptance Criteria:**

1. WHEN a dentist orders a diagnostic test (X-ray, panoramic X-ray, CBCT scan, blood test, pulp vitality test, swab/culture) during examination, THE system SHALL generate or update a Diagnostic_Invoice for that appointment with the test as a line item at the fixed catalogue price.
2. THE system SHALL bill diagnostic tests at the point of ordering, independently of the Treatment_Invoice and independently of each other.
3. THE system SHALL NOT include diagnostic test fees in the Treatment_Invoice.
4. WHEN a Diagnostic_Invoice is generated, THE system SHALL immediately notify the accountant: "Diagnostic test ordered — Patient [name] — [test name] — ETB [price] — Collect now".
5. THE system SHALL allow multiple diagnostic tests to be added to the same Diagnostic_Invoice within a single appointment session.
6. WHEN a Diagnostic_Invoice is fully paid, THE system SHALL set its state to `PAID` and allow the test to proceed.
7. THE system SHALL allow the dentist and the diagnostic test result to be on the same day as the treatment appointment (same-day diagnostic + treatment is permitted).
8. THE system SHALL generate Diagnostic_Invoice numbers in the format `DIAG-{YEAR}-{0001}`.

---

### REQ-12 — Payment Recording by Accountant

**User Story:** As an accountant, I want to record full invoice payments
in one action so that the payment gate lifts immediately and treatment
can begin without delay.

**Acceptance Criteria:**

1. THE accountant role SHALL be the primary staff member responsible for recording all payments against Treatment_Invoices, Card_Invoices, and Diagnostic_Invoices.
2. WHEN an accountant submits a payment equal to the invoice balance, THE system SHALL mark the invoice as `PAID` within 2 seconds and notify the treating dentist.
3. THE system SHALL accept the following payment methods: cash, Telebirr, Chapa, bank transfer.
4. WHEN a payment is recorded, THE system SHALL store: payment amount, payment method, transaction reference (optional free text), UTC timestamp, and the user ID of the accountant who recorded it.
5. THE system SHALL NOT accept a payment that exceeds the invoice balance. IF the submitted amount exceeds the balance, THEN THE system SHALL reject it and return "Payment exceeds balance — Max: ETB [balance]".
6. WHEN a payment is recorded successfully, THE system SHALL display a receipt on screen showing: patient name, invoice number, amount paid, payment method, reference, and remaining balance (ETB 0 if fully paid).
7. THE system SHALL allow the accountant to generate a printable PDF receipt on demand for any recorded payment.
8. THE accountant billing dashboard SHALL show three sections: Unpaid invoices (awaiting payment), Paid invoices, and Payment history — with NO review queue, NO approval queue, and NO "send back" workflow.

---

### REQ-13 — Invoice Immutability After Payment

**User Story:** As a clinic owner, I want paid invoices to be permanently
uneditable so that financial records are always trustworthy and cannot be
altered after money changes hands.

**Acceptance Criteria:**

1. WHEN a Treatment_Invoice transitions to `PAID`, THE system SHALL immediately prevent all modifications to line items, totals, tax amounts, and notes.
2. WHEN a Treatment_Invoice transitions to `LOCKED`, THE system SHALL prevent all further modifications including new payment records.
3. THE system SHALL record a timestamped audit log entry each time an invoice changes state, including: old state, new state, timestamp, and user ID of the actor.
4. IF any API request attempts to modify a line item on a `PAID` or `LOCKED` invoice, THEN THE system SHALL return HTTP 422 with body: `{"error": "Invoice is immutable after payment"}`.
5. THE system SHALL retain all invoice records permanently. Invoice deletion SHALL NOT be permitted once the invoice is in `PAID` or `LOCKED` state.

---

### REQ-14 — Auto-Recall Scheduling Per Treatment Type

**User Story:** As a clinic manager, I want recall appointments scheduled
automatically based on treatment type when a case closes so that patients
return at the right interval without any manual effort from staff.

**Acceptance Criteria:**

1. WHEN a dentist marks a treatment case as "COMPLETE" and the Treatment_Invoice is in `PAID` state, THE system SHALL automatically schedule a Recall appointment using the treatment-type recall interval:
   - Cleaning / scaling → 6 months
   - Filling → 12 months
   - Root canal → 6 months
   - Crown / bridge / prosthetic → 6 months
   - Orthodontic treatment → 3 months
   - Extraction → 3 months
   - General checkup → 12 months
   - (Clinic admin can override per treatment type in settings)
2. WHEN a Recall appointment is scheduled, THE system SHALL send the patient an in-app notification: "Your next visit is on [date] — [clinic name]".
3. THE system SHALL send the patient a reminder notification 14 days before the recall date: "Reminder: Your dental checkup is in 14 days — [date] — [clinic name]".
4. THE system SHALL NOT schedule a Recall appointment if the Treatment_Invoice is still `UNPAID` at case close.
5. WHERE a clinic has not configured a recall interval for a specific treatment type, THE system SHALL default to 6 months.

---

### REQ-15 — Debt Flagging for Unpaid Emergency Cases

**User Story:** As an accountant, I want the system to flag emergency
patients who leave without paying so that the debt is visible on every
future visit and cannot be ignored.

**Acceptance Criteria:**

1. WHEN an emergency appointment is closed and the Treatment_Invoice is still `UNPAID`, THE system SHALL mark the patient record with `has_debt = true` and store a debt record containing: invoice ID, amount owed, date incurred, and the staff member who closed the appointment.
2. WHEN a patient with `has_debt = true` is viewed in the receptionist or accountant interface, THE system SHALL display a prominent red "OUTSTANDING DEBT — ETB [amount]" banner on their patient card and all their appointments.
3. THE system SHALL NOT delete or hide debt records. They SHALL remain on the patient record until the associated invoice is fully paid.
4. WHEN an accountant records full payment against a debt invoice, THE system SHALL clear the `has_debt` flag, transition the invoice to `PAID`, and record a "Debt cleared" audit entry with timestamp and staff ID.
5. THE system SHALL include all patients with `has_debt = true` in the accountant's daily unpaid invoices view regardless of when the debt was incurred.

---

### REQ-16 — Patient Notifications at Key Events

**User Story:** As a patient, I want to receive in-app notifications at
every key billing and appointment event so that I always know what step
comes next and what I owe.

**Acceptance Criteria:**

1. WHEN a Treatment_Invoice is generated after CHECKUP COMPLETE, THE system SHALL send the patient: "Your treatment plan is ready — Total: ETB [amount] — Please proceed to the payment desk".
2. WHEN a Treatment_Invoice is paid, THE system SHALL send the patient: "Payment confirmed — ETB [amount] — Treatment will begin shortly".
3. WHEN a specialist appointment is auto-created, THE system SHALL send the patient: "Specialist appointment booked — Dr. [name] ([type]) — [date] at [time]".
4. WHEN a Fitting_Appointment is auto-created, THE system SHALL send the patient: "Your [crown/bridge/denture] is ready — Fitting with Dr. [name] — [date] at [time]".
5. WHEN an emergency patient leaves with an unpaid invoice, THE system SHALL send the patient: "Outstanding balance — ETB [amount] — Please contact [clinic name] to settle your bill".
6. WHEN a recall appointment is scheduled, THE system SHALL send the patient: "Your next checkup is scheduled for [date] — [clinic name]".
7. ALL patient notifications SHALL be delivered as in-app notifications. WHERE the patient has a registered phone number, THE system SHALL also send an SMS.

---

### REQ-17 — Billing Flow Enforcement by Patient Type

**User Story:** As a receptionist, I want the system to enforce the correct
billing sequence for each patient type — new, existing, or emergency —
so that no billing step is accidentally skipped.

**Acceptance Criteria:**

1. WHEN a new patient arrives (no active card), THE system SHALL enforce this exact sequence:
   - Step 1: Register patient
   - Step 2: Auto-generate Card_Invoice (ETB 200 + VAT)
   - Step 3: Accountant collects card fee → card activated
   - Step 4: Receptionist books appointment
   - Step 5: Patient checks in → assigned to GP queue
   - Step 6: Doctor examination → CHECKUP COMPLETE
   - Step 7: Treatment_Invoice auto-generated
   - Step 8: Accountant collects 100% payment → invoice PAID
   - Step 9: Treatment starts
   - Step 10: Treatment COMPLETE → Recall auto-scheduled

2. WHEN an existing patient with an active card arrives, THE system SHALL enforce this exact sequence:
   - Step 1: Receptionist books appointment
   - Step 2: Patient checks in → assigned to queue
   - Step 3: Doctor examination → CHECKUP COMPLETE
   - Step 4: Treatment_Invoice auto-generated
   - Step 5: Accountant collects 100% payment → invoice PAID
   - Step 6: Treatment starts
   - Step 7: Treatment COMPLETE → Recall auto-scheduled

3. WHEN an emergency patient arrives, THE system SHALL enforce this exact sequence:
   - Step 1: Receptionist OR doctor marks appointment as emergency
   - Step 2: Patient goes directly to treatment room (no queue, no payment gate)
   - Step 3: Treatment performed
   - Step 4: Treatment COMPLETE → Treatment_Invoice auto-generated
   - Step 5: Accountant collects 100% payment before discharge
   - Step 6: IF patient cannot pay → `has_debt = true` flagged

4. THE system SHALL display the current active step on the appointment card on the receptionist dashboard.
5. WALK-IN patients (no prior appointment) SHALL follow the same sequence as the appropriate patient type (new or existing).
6. THE system SHALL visually distinguish emergency appointments from normal appointments using a red badge on all dashboards and queue views.

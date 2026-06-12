# Smart Appointment Flow — Implementation Tasks

## Phase 1: Database Migrations

- [ ] 1.1 Create migration: add `appointment_kind` ENUM(service,treatment,emergency) to appointments
- [ ] 1.2 Create migration: add `is_emergency_bypass` BOOLEAN to appointments
- [ ] 1.3 Create migration: add `treatment_plan_id` INT nullable FK to appointments
- [ ] 1.4 Create migration: add `specialist_category` VARCHAR to services
- [ ] 1.5 Create migration: add `is_diagnostic` BOOLEAN to services
- [ ] 1.6 Create migration: add `requires_fab_lab` BOOLEAN to services
- [ ] 1.7 Create migration: create `treatment_plans` table
- [ ] 1.8 Create migration: create `lab_orders` table
- [ ] 1.9 Create migration: add `lab_technician` to users role ENUM

## Phase 2: Models

- [ ] 2.1 Create `TreatmentPlan` model with relationships and status constants
- [ ] 2.2 Create `LabOrder` model with status machine methods
- [ ] 2.3 Update `Appointment` model: add `appointment_kind`, `treatment_plan_id`, `is_emergency_bypass` to fillable/casts
- [ ] 2.4 Update `Service` model: add `specialist_category`, `is_diagnostic`, `requires_fab_lab` to fillable
- [ ] 2.5 Update `TreatmentEpisode` model: add `treatment_plan_id` relationship

## Phase 3: Auto-Assignment Service

- [ ] 3.1 Create `AppointmentAutoAssigner` service class with:
  - `assignForService(clinicId, branchId, serviceId, preferredTime)` → finds free specialist
  - `assignForTreatment(clinicId, branchId, preferredTime)` → finds free GP
  - `assignForEmergency(clinicId, branchId)` → finds any free dentist
  - `findLeastBusy(staffCollection, date)` → helper

## Phase 4: Service Checkup Flow (Backend)

- [ ] 4.1 Add `POST /dentist/appointments/{id}/complete-checkup` endpoint
  - Finalizes invoice with all added items
  - Sets lifecycle_status = under_review
  - Sends to accountant queue
- [ ] 4.2 Modify `MedicalRecordController::addProcedure` to support `service` appointment type
- [ ] 4.3 Modify `Receptionist/AppointmentController::store` to use `AppointmentAutoAssigner`
- [ ] 4.4 Modify `Manager/ManagerAppointmentController::store` to use `AppointmentAutoAssigner`
- [ ] 4.5 Add `appointment_kind` field handling in booking controllers

## Phase 5: Treatment Plan (Backend)

- [ ] 5.1 Create `TreatmentPlanController` in Dentist namespace:
  - `store` — create plan from appointment
  - `show` — get plan details
  - `update` — modify plan
  - `complete` — mark plan completed, generate final invoice
- [ ] 5.2 Register treatment plan routes in dentist.php
- [ ] 5.3 Auto-generate treatment estimate invoice when plan is saved
- [ ] 5.4 Add `treatment_plan_id` to TreatmentEpisode migration and model

## Phase 6: Lab Order Flow (Backend)

- [ ] 6.1 Create `LabOrderController` in Dentist namespace: `store`, `show`, `index`
- [ ] 6.2 Create `LabOrderController` in Lab namespace: `index`, `show`, `updateStatus`, `addNote`
- [ ] 6.3 Create `LabDashboardController` in Lab namespace: `index` (KPIs)
- [ ] 6.4 Create `LabSettingsController` in Lab namespace: `getProfile`, `updateProfile`, `changePassword`
- [ ] 6.5 Create `LabNotificationController`: `index`, `count`
- [ ] 6.6 Create `routes/api/v1/lab.php` route file
- [ ] 6.7 Register lab routes in `routes/api.php`
- [ ] 6.8 Create `LabOrderReady` event
- [ ] 6.9 Create `ScheduleFittingAppointment` listener → auto-schedules specialist appointment
- [ ] 6.10 Register event/listener in `EventServiceProvider`

## Phase 7: Lab Technician Dashboard (Frontend)

- [ ] 7.1 Create `src/pages/lab-technician/Dashboard.jsx`
  - KPI cards: pending, due today, in progress, completed this week
  - Quick action: view pending orders
- [ ] 7.2 Create `src/pages/lab-technician/Orders.jsx`
  - Orders table with filters (status, type, due date)
  - Status badge colors
  - Action buttons per status
- [ ] 7.3 Create `src/pages/lab-technician/OrderDetail.jsx`
  - Full order info, instructions, tooth numbers
  - Status update flow with confirmation
  - Notes input
- [ ] 7.4 Create `src/pages/lab-technician/Settings.jsx`
  - Profile, password change
- [ ] 7.5 Create `src/services/labService.js`
  - `getDashboard()`, `getOrders(params)`, `getOrder(id)`, `updateOrderStatus(id, status)`, `addNote(id, note)`
- [ ] 7.6 Create `src/components/layout/LabLayout.jsx`
  - Sidebar nav: Dashboard / Orders / Settings
- [ ] 7.7 Add lab-technician routes to `App.jsx` / router
- [ ] 7.8 Handle lab_technician role in `useAuthStore` role routing

## Phase 8: Service Checkup UI (Frontend — Dentist)

- [ ] 8.1 Add "Complete Checkup" button to dentist appointment detail screen
  - Only shown for `appointment_kind = service` appointments
  - Shows summary of added items before confirming
- [ ] 8.2 Add "Add Extra Item" section to dentist appointment view for service appointments
  - Service picker dropdown
  - Quantity
  - Adds to live invoice immediately
- [ ] 8.3 Show live invoice running total during checkup

## Phase 9: Treatment Plan UI (Frontend — Dentist)

- [ ] 9.1 Create `TreatmentPlanModal.jsx` component
  - Diagnosis text field
  - Add procedures (service catalogue picker)
  - Session count estimate
  - Toggle: "Requires Fabrication Lab"
    - If yes: order type, material, tooth numbers, expected ready date
  - Toggle: "Refer to Specialist"
    - If yes: specialist type dropdown
  - "Generate Estimate" button
- [ ] 9.2 Add "Create Treatment Plan" button to dentist appointment after examination

## Phase 10: Booking Kind UI Update (Frontend — Receptionist/Manager)

- [ ] 10.1 Update `AppointmentRegistrationModal.jsx`:
  - Add booking kind selector at top: Service / Treatment / Emergency
  - Service: show service picker → dentist auto-filled (read-only)
  - Treatment: show complaint text → GP auto-assigned (read-only)
  - Emergency: minimal form → assign immediately
- [ ] 10.2 Update `ServiceSeeder` with `specialist_category` and `is_diagnostic` for all 24 services

## Phase 11: Accountant Invoice Review Update

- [ ] 11.1 Add filter for `invoice_type = treatment_estimate` in accountant invoices
- [ ] 11.2 Add "Approve Estimate" action on estimate invoices
- [ ] 11.3 Show treatment plan summary alongside estimate invoice
- [ ] 11.4 Add deposit recording on estimate approval

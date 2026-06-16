# Requirements Document

## Introduction

This feature adds a comprehensive plan management system and subdomain access control layer for the DentflowPro platform administrator (super admin). It covers the full lifecycle of both free and paid subscription plans, automatic plan expiry enforcement, manual subdomain enable/disable controls for clinics and branches, platform-level billing visibility, and payment management for paid plan activations. The system is built on top of the existing `plans`, `subscriptions`, `clinics`, and `branches` models in the Laravel backend.

## Glossary

- **Platform_Admin**: The super-administrator user who manages the DentflowPro platform. Has full control over all clinics, branches, and plans.
- **Plan**: A subscription tier defined by the Platform_Admin. A plan is either Free or Paid.
- **Free_Plan**: A plan with zero monetary cost. It has a fixed duration in days. No annual billing option exists.
- **Paid_Plan**: A plan with a monetary cost in Ethiopian Birr (ETB). It has a configurable duration and must offer an annual billing option in addition to the base duration.
- **Clinic**: A registered dental clinic with its own subdomain on the DentflowPro platform.
- **Branch**: A physical location belonging to a Clinic. Each branch also has its own subdomain.
- **Subdomain**: A unique URL prefix (e.g., `nile-smile.dentflowpro.com`) that identifies and routes traffic to a specific Clinic or Branch.
- **Subscription**: A record linking a Clinic to a Plan for a specific billing period, including payment status and expiry date.
- **Plan_Assignment**: The act of the Platform_Admin assigning or changing a Plan for a Clinic.
- **Subscription_Expiry**: The point in time when a Subscription's `ends_at` timestamp is reached and the associated access is automatically revoked.
- **Subdomain_Access**: The active/inactive state of a Clinic or Branch subdomain. When disabled, the subdomain returns an access-denied response.
- **Billing_Cycle**: The period for which a subscription payment applies — `days` (free), `monthly`, or `annual`.
- **Annual_Price**: The discounted price offered when a Paid_Plan is billed annually instead of monthly.
- **ETB**: Ethiopian Birr, the currency used for all platform-level payments.
- **Scheduler**: The Laravel task scheduler that runs automated checks (e.g., expiry enforcement) on a periodic basis.
- **Plan_Payment**: A payment record proving that a Clinic has paid for a Paid_Plan activation or renewal.

---

## Requirements

### Requirement 1: Plan Definition — Free vs. Paid

**User Story:** As a Platform_Admin, I want to define plans as either free or paid with distinct configuration rules, so that I can offer appropriate options to clinics without payment confusion.

#### Acceptance Criteria

1. THE Plan SHALL have a `type` field with exactly two permitted values: `free` and `paid`.
2. WHEN a Platform_Admin creates a Free_Plan, THE Plan SHALL require a duration expressed as a positive integer number of days and SHALL NOT require a monetary amount.
3. WHEN a Platform_Admin creates a Paid_Plan, THE Plan SHALL require a monetary amount in ETB (a positive decimal) and SHALL require a base duration expressed in days, months, or years.
4. WHEN a Platform_Admin creates a Paid_Plan, THE Plan SHALL also store an annual price in ETB representing the cost when billed annually.
5. IF a Platform_Admin attempts to set a monetary amount on a Free_Plan, THEN THE Plan SHALL reject the request and return a validation error.
6. IF a Platform_Admin attempts to set an annual price on a Free_Plan, THEN THE Plan SHALL reject the request and return a validation error.
7. THE Plan SHALL store `is_active` boolean to allow the Platform_Admin to enable or disable a plan from being assignable to new clinics.

---

### Requirement 2: Plan CRUD by Platform Admin

**User Story:** As a Platform_Admin, I want full create, read, update, and delete control over plans, so that I can maintain an accurate and up-to-date plan catalog.

#### Acceptance Criteria

1. THE Platform_Admin SHALL be able to list all plans including their type, pricing, duration, and active status.
2. THE Platform_Admin SHALL be able to create a new plan by providing name, type, duration, and (for paid plans) monetary amounts.
3. WHEN a Platform_Admin updates a plan, THE Plan SHALL update only the fields provided and leave all other fields unchanged.
4. WHEN a Platform_Admin attempts to delete a plan that has at least one active Subscription, THE System SHALL reject the deletion and return the count of blocking active subscriptions.
5. WHEN a Platform_Admin deactivates a plan (`is_active = false`), THE System SHALL prevent the plan from being assigned to new clinics while leaving existing subscriptions on that plan unaffected.

---

### Requirement 3: Plan Assignment to Clinics

**User Story:** As a Platform_Admin, I want to assign or change plans for individual clinics, so that each clinic operates under the correct access tier.

#### Acceptance Criteria

1. THE Platform_Admin SHALL be able to assign any active Plan to any Clinic.
2. WHEN a Platform_Admin assigns a Free_Plan to a Clinic, THE Subscription SHALL be created with `status = active`, `billing_cycle = days`, `amount_paid = 0`, and `ends_at` set to current time plus the plan's duration in days.
3. WHEN a Platform_Admin assigns a Paid_Plan to a Clinic and specifies `billing_cycle = annual`, THE Subscription SHALL use the plan's annual price for `amount_paid` and set `ends_at` to one year from the activation date.
4. WHEN a Platform_Admin assigns a Paid_Plan to a Clinic and specifies `billing_cycle = monthly`, THE Subscription SHALL use the plan's monthly price for `amount_paid` and set `ends_at` to one month from the activation date.
5. WHEN a Clinic already has an active Subscription and the Platform_Admin assigns a new Plan, THE System SHALL expire the current Subscription and create a new Subscription for the new Plan.
6. IF a Platform_Admin attempts to assign an inactive Plan to a Clinic, THEN THE System SHALL reject the assignment and return a descriptive error.
7. WHEN a plan is assigned, THE Subdomain_Access for the Clinic SHALL be set to enabled.

---

### Requirement 4: Automatic Subscription Expiry

**User Story:** As a Platform_Admin, I want subscriptions to expire automatically when their duration ends, so that clinics cannot continue accessing the system without a valid active plan.

#### Acceptance Criteria

1. THE Scheduler SHALL check all active Subscriptions at least once every hour and compare `ends_at` to the current time.
2. WHEN a Subscription's `ends_at` is in the past, THE Scheduler SHALL set the Subscription `status` to `expired`.
3. WHEN a Subscription is set to `expired`, THE System SHALL automatically disable the Subdomain_Access for the associated Clinic.
4. WHEN a Subscription is set to `expired`, THE System SHALL automatically disable the Subdomain_Access for all Branches belonging to the associated Clinic.
5. WHEN a Subscription is set to `expired`, THE System SHALL set `is_active = false` for all Users belonging to the associated Clinic, preventing login.
6. WHEN a Clinic's Subscription is set to `expired`, THE System SHALL update the Clinic's `status` field to `suspended`.
7. THE Scheduler SHALL log each expiry action including clinic ID, subscription ID, and timestamp for audit purposes.

---

### Requirement 5: Manual Subdomain Access Control by Platform Admin

**User Story:** As a Platform_Admin, I want to manually enable or disable the subdomain access of any clinic or branch at any time, so that I can immediately enforce access decisions outside the normal subscription lifecycle.

#### Acceptance Criteria

1. THE Platform_Admin SHALL be able to disable the Subdomain_Access of any Clinic independently of subscription status.
2. THE Platform_Admin SHALL be able to enable the Subdomain_Access of any Clinic that has been manually disabled.
3. THE Platform_Admin SHALL be able to disable the Subdomain_Access of any individual Branch independently of its parent Clinic's status.
4. THE Platform_Admin SHALL be able to enable the Subdomain_Access of any individual Branch independently of its parent Clinic's status.
5. WHEN the Platform_Admin disables a Clinic's Subdomain_Access, THE System SHALL set `subdomain_active = false` on the Clinic record and SHALL NOT alter the Subscription status.
6. WHEN the Platform_Admin enables a Clinic's Subdomain_Access, THE System SHALL set `subdomain_active = true` on the Clinic record and SHALL NOT alter the Subscription status.
7. WHEN a Subdomain is accessed and its `subdomain_active = false`, THE System SHALL return an HTTP 403 response with a message indicating the subdomain is suspended.
8. WHILE a Clinic's Subdomain_Access is disabled, THE System SHALL also block access to all of the Clinic's Branch subdomains.

---

### Requirement 6: Branch Subdomain Management

**User Story:** As a Platform_Admin, I want each branch to have its own subdomain with independent access control, so that I can manage branch-level access without affecting other branches or the parent clinic.

#### Acceptance Criteria

1. THE Branch SHALL have a `subdomain` field that stores its unique subdomain identifier.
2. THE Branch SHALL have a `subdomain_active` boolean field that controls whether its subdomain is accessible.
3. WHEN a Branch is created, THE System SHALL generate a unique subdomain for it derived from the Branch name and parent Clinic subdomain.
4. WHEN a Platform_Admin disables a Branch's Subdomain_Access, THE System SHALL set `subdomain_active = false` on the Branch record only, without affecting the parent Clinic or sibling Branches.
5. WHEN the Clinic's Subdomain_Access is disabled (manually or via expiry), THE System SHALL treat all of the Clinic's Branches as inaccessible regardless of each Branch's individual `subdomain_active` value.
6. IF a request arrives for a Branch subdomain and the parent Clinic's `subdomain_active = false`, THEN THE System SHALL return an HTTP 403 response.
7. IF a request arrives for a Branch subdomain and the Branch's own `subdomain_active = false`, THEN THE System SHALL return an HTTP 403 response.

---

### Requirement 7: Platform Admin Dashboard — Clinic Plan Status View

**User Story:** As a Platform_Admin, I want a consolidated view of each clinic's plan, subscription status, payment status, and expiry date, so that I can monitor the health of all clinic subscriptions without navigating multiple screens.

#### Acceptance Criteria

1. THE Platform_Admin SHALL be able to retrieve a list of all clinics with the following data per clinic: clinic name, subdomain, current plan name, plan type (free/paid), subscription status, subscription `ends_at`, days remaining until expiry, `subdomain_active` state, and payment status.
2. THE Platform_Admin SHALL be able to filter the clinic list by subscription status (`active`, `expired`, `pending`, `suspended`).
3. THE Platform_Admin SHALL be able to filter the clinic list by plan type (`free`, `paid`).
4. THE Platform_Admin SHALL be able to search the clinic list by clinic name, subdomain, or email.
5. WHEN a subscription has 7 days or fewer remaining, THE System SHALL include an `expiry_warning = true` flag in the clinic's response data.
6. THE Platform_Admin SHALL be able to retrieve all branch details for a specific clinic, including each branch's subdomain, `subdomain_active` state, and status.

---

### Requirement 8: Payment Recording for Paid Plans

**User Story:** As a Platform_Admin, I want to record payments made by clinics for paid plans, so that there is a clear audit trail of which clinics have paid and when each payment was received.

#### Acceptance Criteria

1. THE Platform_Admin SHALL be able to record a Plan_Payment for a Clinic specifying: amount in ETB, payment method, payment reference/receipt number, and payment date.
2. WHEN a Plan_Payment is recorded and the paid amount matches the expected plan price for the selected billing cycle, THE Subscription SHALL be activated with `status = active`.
3. IF a Plan_Payment amount does not match the expected plan price for the selected billing cycle, THEN THE System SHALL reject the payment and return the expected amount.
4. THE System SHALL store each Plan_Payment as an immutable record that cannot be deleted.
5. THE Platform_Admin SHALL be able to view the full payment history for any Clinic, ordered by payment date descending.
6. WHEN a Plan_Payment is successfully recorded, THE System SHALL enable the Clinic's Subdomain_Access (`subdomain_active = true`).
7. WHEN a Plan_Payment is successfully recorded, THE System SHALL create or update the Subscription with the correct `starts_at` and `ends_at` based on billing cycle.

---

### Requirement 9: Annual Billing for Paid Plans

**User Story:** As a Platform_Admin, I want paid plans to support annual billing at a separate price, so that clinics can choose to pay annually for a discounted rate.

#### Acceptance Criteria

1. WHEN a Paid_Plan is created, THE Plan SHALL require both a `monthly_price` and an `annual_price` stored in ETB.
2. WHEN a Clinic subscribes to a Paid_Plan with `billing_cycle = annual`, THE Subscription `ends_at` SHALL be set to exactly 365 days from `starts_at`.
3. WHEN a Clinic subscribes to a Paid_Plan with `billing_cycle = monthly`, THE Subscription `ends_at` SHALL be set to exactly 30 days from `starts_at`.
4. THE Free_Plan SHALL NOT have a `billing_cycle` of `annual` — its only valid billing cycle is `days`.
5. IF a Platform_Admin attempts to assign a Free_Plan with `billing_cycle = annual`, THEN THE System SHALL reject the assignment and return a validation error.

---

### Requirement 10: Subdomain Access Enforcement Middleware

**User Story:** As a Platform_Admin, I want the system to enforce subdomain access rules on every request, so that suspended or expired clinics cannot bypass access controls.

#### Acceptance Criteria

1. THE System SHALL apply a middleware to all clinic-scoped and branch-scoped API routes that checks the requestor's clinic `subdomain_active` status.
2. WHEN a request arrives for a Clinic whose `subdomain_active = false`, THE Middleware SHALL return an HTTP 403 JSON response with `code = SUBDOMAIN_SUSPENDED` before the request reaches the controller.
3. WHEN a request arrives for a Clinic whose Subscription `status = expired`, THE Middleware SHALL return an HTTP 403 JSON response with `code = SUBSCRIPTION_EXPIRED`.
4. WHEN a request arrives for a Clinic whose `status = suspended`, THE Middleware SHALL return an HTTP 403 JSON response with `code = CLINIC_SUSPENDED`.
5. THE Middleware SHALL allow requests from Platform_Admin users to pass through without subdomain access checks.
6. THE Middleware SHALL allow unauthenticated public-landing routes to pass through without subdomain access checks.

---

### Requirement 11: Clinic Suspension and Reactivation by Platform Admin

**User Story:** As a Platform_Admin, I want to suspend and reactivate clinics, so that I can immediately revoke or restore full access in response to operational or compliance needs.

#### Acceptance Criteria

1. THE Platform_Admin SHALL be able to suspend a Clinic by setting its `status = suspended` and `subdomain_active = false`.
2. WHEN a Clinic is suspended by the Platform_Admin, THE System SHALL set `is_active = false` for all Users belonging to the Clinic.
3. THE Platform_Admin SHALL be able to reactivate a suspended Clinic by setting its `status = active` and `subdomain_active = true`.
4. WHEN a Clinic is reactivated by the Platform_Admin, THE System SHALL set `is_active = true` for the Clinic's `clinic_admin` User.
5. WHEN a Clinic is reactivated by the Platform_Admin, THE System SHALL only restore access if the Clinic has an active (non-expired) Subscription.
6. IF a Platform_Admin attempts to reactivate a Clinic with no active Subscription, THEN THE System SHALL return a warning message indicating that a valid subscription must be assigned before access is restored, but SHALL still update the clinic status to `active`.

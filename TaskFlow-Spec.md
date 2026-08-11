# TaskFlow — Build Spec

## Overview
Build an internal time-tracking and approval platform to replace the project management tool the company currently pays an external license for. Employees log daily hours against client-tied tasks, submit weekly, and their manager approves before that data counts toward company reporting.

## Features
- Task creation and assignment, tied to specific clients.
- Daily time logging against assigned tasks.
- Weekly submission of logged hours for manager review.
- Manager approval workflow: approve or return submissions, with returned entries editable by the employee.
- Role-based dashboards: Workspace (individual contributor), Manager, and Director views.
- Manager view auto-scoped to their own direct reports, driven by the company directory — no manual permission setup.
- Director-and-above view: full company-wide visibility into hours per client.
- Bulk time entry via Excel upload.
- Downloadable reports.
- Automated reminders so pending approvals don't silently stall.
- Login via existing Microsoft account (SSO) — no separate password.

## Tech Stack
- FastAPI (backend)
- React + Vite (frontend)
- MongoDB (database)
- Brand styling matched to ProductSquads (deep violet `#6100E4`, bright purple `#9812FF`; Manrope for headings, Inter for data-heavy screens)

## Data Model
- **User**: name, email, role, manager reference (sourced from company directory)
- **Client**: name, associated tasks
- **Task**: title, client reference, assigned user(s)
- **TimeEntry**: task reference, employee reference, date, hours, status (draft / submitted / approved / returned)
- **Report**: aggregated approved hours, filterable by client, employee, or date range

## Business Rules / Constraints
- Only approved time entries may feed into company reporting — unapproved data must never appear in reports.
- Managers can only see and approve submissions from users who report to them, determined automatically from the company directory.
- Directors and above can see company-wide hours per client, with no manual permission configuration required.
- Users authenticate via Microsoft SSO — no separate password management.
- Returned entries must be editable and re-submittable by the original employee.
- Reminders must trigger automatically for approvals pending beyond a defined threshold.

## Out of Scope (this version)
- Feature flag system (planned for v2).
- Payroll or invoicing integration.
- Mobile application.
- Custom permission overrides outside the directory-driven model.

## Acceptance Criteria
- An employee can log hours against a client-tied task and submit a full week for approval.
- A submitted entry automatically appears in the correct manager's approval queue, with no manual routing.
- Approving an entry makes it appear in company reporting; it does not appear before approval.
- A returned entry is editable by the employee and can be resubmitted.
- A Director-level user can view total hours per client across the whole company without any manual permission setup.
- Bulk Excel upload correctly creates or updates time entries matching the file's data.
- An automated reminder is sent for any submission pending approval past the defined threshold.
- Login succeeds via Microsoft SSO without requiring a separate TaskFlow password.

# ClarityTrack  
## Software Project Documentation

**Document type:** Basic software project documentation  
**Application:** ClarityTrack — Multi-Company Work From Home (WFH) Tracking System  
**Version:** 0.1.0  

---

## 1. Introduction

ClarityTrack is a multi-company Work From Home (WFH) tracking system. It helps organizations manage remote employees through secure company portals.

Each company works in its own isolated workspace. Company users sign in with a **Company ID**. Platform owners use a separate **Super Admin** portal to create companies and manage subscription plans.

The system supports work sessions, breaks, tasks, meetings, role-based access, and company-level reporting.

---

## 2. Problem Statement

Remote teams need a clear way to track work time, assign tasks, and run meetings without mixing data between different companies.

Common problems include:

- Difficulty monitoring remote work sessions and breaks in a transparent way  
- No shared place for task assignment and submission review  
- Meeting links and reminders that are hard to distribute to the right people  
- Risk of one company seeing another company’s employee or session data  
- Limited control for platform owners over company accounts and plan limits  

ClarityTrack addresses these needs with company isolation, role-based portals, and day-to-day WFH tracking tools.

---

## 3. Objectives

The main goals of ClarityTrack are to:

- Provide a multi-company WFH tracking platform with strict data isolation  
- Allow Super Admins to create and manage companies and subscription plans  
- Enable Company Admins to approve users, allocate work, and review activity  
- Help Managers review team work and assign tasks  
- Give Employees a simple way to run sessions, take breaks, complete tasks, and join meetings  
- Support secure sign-in and role-based access across the platform  

---

## 4. Project Scope

### In scope

ClarityTrack provides:

- Multi-company registration and isolated company workspaces  
- User roles: Super Admin, Company Admin, Manager, and Employee  
- Employee registration with admin approval  
- Work session start/end and break tracking  
- Idle warning and auto-logout behavior during sessions  
- Task assignment, submission, and review workflows  
- Meeting creation (single and group), link sharing, notifications, reminders, and group chat  
- Reports for selected date ranges  
- Manual backup download for company admins  
- Browser-based access, with optional Progressive Web App (PWA) install and optional desktop client  

### Out of scope

The current project does not claim:

- Full payroll, HRIS, or accounting modules  
- Unrestricted cross-company data sharing  
- Complex UML or low-level database design in this document  

---

## 5. Target Users

| Role | Description |
|------|-------------|
| **Super Admin** | Platform owner. Creates companies, manages subscription plans, and oversees platform-level settings. Uses the Super Admin portal (no Company ID required). |
| **Company Admin** | Company owner/operator. Approves users, manages policy and backups, allocates work, schedules meetings, and views company reports. Signs in with Company ID. |
| **Manager** | Team lead. Reviews submissions, views team time, and assigns tasks within the company. Signs in with Company ID. |
| **Employee** | Remote worker. Runs work sessions and breaks, submits tasks, receives meeting notifications, and uses group chat when invited. Signs in with Company ID. |

---

## 6. Main Features

### 6.1 Multi-Company Management

Super Admins can create companies and company admin accounts. Each company has its own identity (Company ID / slug) used at sign-in.

### 6.2 Company Data Isolation

Each company’s employees, sessions, tasks, meetings, and related records are stored separately. One company cannot access another company’s data.

### 6.3 Employee Management

Employees and additional admins can register under a Company ID. Company Admins approve or reject pending registrations before users can work in the system.

### 6.4 Work Session Tracking

Employees start and end work sessions. The system records session status and related time activity for transparency and reporting.

### 6.5 Break Management

During an active session, employees can take breaks. Break time is tracked as part of the work day record.

### 6.6 Task Management

Admins and managers can assign work. Employees submit completed work for review. Company Admins can use a board-style work allocation view (for example: To do, In progress, Submitted, Done, Overdue).

### 6.7 Meeting Management

Admins can create single or group meetings, paste a call link, set the meeting time, and notify participants. Participants receive notifications and a reminder about 15 minutes before the scheduled start. Group members can use group chat for discussion.

### 6.8 Role-Based Access Control

Access depends on role. Employees see their own work data. Managers and admins see the company tools allowed for their role. Super Admins operate only at the platform level.

### 6.9 Super Admin Portal

The Super Admin portal is used to manage companies, review platform activity, and configure subscription plans.

### 6.10 Subscription Plan Management

Plans define seat limits and subscription rules. Company access can follow plan settings such as trial or paid limits managed by the Super Admin.

---

## 7. System Workflow

### 7.1 Platform setup

1. Super Admin is created (first-time setup with setup secret).  
2. Super Admin creates a company and an initial Company Admin.  
3. Company Admin signs in with Company ID.  

### 7.2 Company onboarding

1. Employees (and optional extra admins) register with the Company ID.  
2. Company Admin approves pending accounts.  
3. Approved users sign in and use their role portal.  

### 7.3 Daily employee work

1. Employee signs in and starts a work session.  
2. Employee may take breaks as needed.  
3. Employee works on assigned tasks and submits results.  
4. Employee receives meeting notifications, joins with the shared link, and may use group chat.  

### 7.4 Admin and manager operations

1. Admin allocates tasks and monitors sessions.  
2. Manager reviews team submissions and time.  
3. Admin schedules meetings, sends links with times, and manages groups.  
4. Admin generates reports and may download a manual backup.  

### 7.5 Access path

Users open ClarityTrack in a browser (or install it as a browser app). Optional desktop client support is available for employee session use against the same server.

---

## 8. Technology Stack

The following technologies are confirmed in the current ClarityTrack project:

| Layer | Technology |
|-------|------------|
| Web application framework | Next.js |
| UI library | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui (Base UI) |
| Optional employee desktop client | Electron |
| Client install option | Progressive Web App (PWA) support |

Runtime data for companies and platform records is kept in server-side application storage used by the ClarityTrack backend APIs. Passwords are stored in hashed form. Sign-in uses secure session cookies.

---

## 9. Functional Requirements

The system shall:

1. Allow Super Admins to create and manage companies and subscription plans.  
2. Isolate each company’s data from all other companies.  
3. Require Company ID for company-level sign-in (Employee, Manager, Company Admin).  
4. Support user registration with Company Admin approval.  
5. Allow employees to start and end work sessions and manage breaks.  
6. Provide idle warning and related session logout behavior for active work sessions.  
7. Support task assignment, submission, and review.  
8. Support single and group meetings with link sharing, timed notifications, and reminders.  
9. Provide group chat for meeting groups.  
10. Enforce role-based screens and permissions.  
11. Allow Company Admins to view reports for selected date ranges.  
12. Allow Company Admins to download a manual backup of company data.  
13. Allow users to access the application through a web browser, with optional PWA install.  

---

## 10. Non-Functional Requirements

### Security

- Company data isolation between tenants  
- Role-based access to features and records  
- Hashed passwords  
- Authenticated session cookies for protected actions  

### Performance

- Application should respond promptly for normal daily use (sign-in, sessions, tasks, meetings, and reports)  

### Reliability

- Session and task records should persist on the server for ongoing company use  
- Users should be able to recover access flows such as approved registration and sign-in after approval  

### Usability

- Clear portals for Super Admin, Company Admin, Manager, and Employee  
- Simple Company ID–based sign-in for company users  
- Straightforward session, task, and meeting actions for remote staff  

---

## 11. Conclusion

ClarityTrack is a multi-company WFH tracking system designed for independent remote teams on one platform. It combines company isolation, role-based portals, session and break tracking, task workflows, and meeting tools under Super Admin plan control.

The system gives Super Admins platform oversight, Company Admins operational control, Managers team review tools, and Employees a practical daily workspace—while keeping each company’s information separate and secure.

---

**End of document**

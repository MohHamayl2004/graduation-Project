# Student accounts

Registration saves the student's full name, normalized email, date of birth,
password hash, and academic stream in MongoDB. Supported streams are scientific,
literary, commercial, industrial, sharia, and hotel. The school discount code is
optional. City and subscription choice are collected during registration. Registration
starts a session immediately; free accounts open the dashboard and paid choices open
the subscription page to complete the simulated payment.
Email verification, SMTP/Gmail configuration, SMS, and password recovery are not
part of this version, following the requested simplified signup/login flow.

The authenticated profile provides the name and stream displayed in the header,
sidebar, and dashboard greeting. Sessions survive refresh in the current tab via
sessionStorage and are validated against the API. Signing out clears the token.
Session restoration has a 12-second timeout. A temporary connection failure keeps
the saved token and shows a retry/sign-in choice instead of an endless loading
screen. Refresh retries automatically; invalid or blocked sessions are signed out.
Private pages redirect signed-out visitors to login. Inactive accounts cannot
sign in or reuse a previously issued token.

JWTs include the real MongoDB `sub`, the server-assigned `role`, and `niprasId`
when assigned. They are signed with HS256 and encrypted as a nested JWE using
JOSE with `dir`/`A256GCM`. The encryption key is derived from the backend-only
JWT secret using HKDF with a separate encryption context. The real identifier
remains inside the encrypted payload; no substitute random account ID is used.
Encryption uses a fresh IV, so the ciphertext can differ between logins.
Verification allows only these algorithms and requires the identity claims.
Every protected request loads the
account and compares the signed role against its current database role; mismatches
require a new login. Admin endpoints require admin in both places. Signup always
assigns student, regardless of a submitted role. Old unencrypted tokens must
sign in again. Typing `/admin` while already signed in as admin is expected;
the URL itself grants no permissions.

New signup passwords accept printable ASCII letters, numbers and symbols only,
without spaces, with a minimum of eight characters and maximum of 72 bytes.
Signup filters unsupported characters with an inline explanation; the API also
rejects them. Login remains compatible with existing account passwords.

## School discount codes

School coupons are separate from school workspace invitations. A valid coupon
saves its school name, code, and server-controlled discount percentage in the
student profile. It does not grant school workspace membership. Expired or
inactive coupons are rejected. The billing API applies the discount to its own
price calculation. Real payment processing is not connected.

From the backend folder, an operator can create/update a contracted-school code:

```powershell
node scripts/createSchoolCoupon.js --code=SCHOOL-2026 --school="School name" --discount=20 --expires=2027-01-01
```

Use the actual agreed discount. `--active=false` disables the coupon.
Existing school invitation codes remain available through the separate join API;
they are not automatically accepted as discount coupons.

Administrators can now open **كوبونات الخصم** from `/admin`, or use
`/admin/coupons`. Create a unique code with a school name, discount (1–100%) and
integer validity duration (1–3650 days). Validity starts at creation and is checked
by the billing/signup APIs. The list shows active, expired and disabled coupons,
expiry dates and remaining time, with search/status filters and enable/disable
controls. Expired coupons cannot be enabled again; create a new code instead.
Coupon creation/status actions are recorded in the admin audit log. Students
cannot access the management endpoints.

`node backend/scripts/seedDemoCoupons.js` provisions two local-only example school
coupons once, saves their generated codes in ignored `.local/demo-coupons.json`,
and verifies their monthly checkout amounts. These are fictional school names.
Coupon integration tests use a dedicated `nipras_coupon_test` database:
`NODE_ENV=test MONGO_URI_TEST=... node --test backend/tests/coupons.test.js`.

## Tests

Run `npm test`, `npm --prefix backend test`, and `npm run build`.
The account lifecycle additionally has a real MongoDB integration test:

```powershell
$env:NODE_ENV='test'
$env:MONGO_URI_TEST='mongodb://127.0.0.1:27017/nipras_account_test'
node --test backend/tests/accountFlows.test.js
```

The test helper rejects non-test database names and never falls back to the
application database. Integration tests clear only the dedicated test database.

## Subscriptions and administration

Free access lasts seven days from account creation. Existing student accounts retain
their original creation date when their trial is initialized. Paid plans are monthly
($39.99, 30 days), quarterly ($109.99, 120 days), and yearly ($399.99, 365 days).
Paid access starts on activation. Purchases during an active trial or paid plan
reserve separate periods after the current plan and any previously queued plans.
The current tier and expiry stay unchanged; each reserved tier activates automatically
at its own start. Each day is exactly 24 hours; displayed local times can change
across daylight-saving transitions.

`/subscription` shows the current plan, dates, remaining days, queued plans,
renewal choices and payment history. City is collected at signup; legacy accounts
can set a missing city once. Active students confirm the scheduled start before
continuing to `/subscription/checkout`, where school coupons and payment appear.
Visa checkout uses fixed fictional details;
card information is never sent to the API or stored. Successful demo checkout
activates access immediately when expired, or reserves the next period when active.
An idempotency key prevents retrying one payment from reserving another period.
Demo payments are disabled in production
and can also be disabled with `DEMO_PAYMENTS_ENABLED=false`.

Subscription states are FREE, ACTIVE and INACTIVE. An expired subscription can
still sign in to renew, while the API blocks study features. Expiry is checked on
every protected request and persisted by a minute-based maintenance task.
Administrative account blocking is separate and also blocks authentication.

Create the local administrator from the repository root:

```powershell
node backend/scripts/createAdmin.js
```

The generated credentials are saved in ignored `.local/admin-account.json`.
Sign in through `/login` to reach `/admin`. Public signup cannot assign admin roles.
An administrator can search by email, grant a monthly/quarterly/yearly plan free
of charge, deactivate a subscription, block/unblock an account, or permanently
delete a student. Reasons are optional; the audit records a default description
when omitted. A free grant starts a fresh plan from now, marks it `admin_gift`,
unblocks the account and activates access without creating a payment or revenue.
The legacy activate action does not remove a block.

Permanent deletion requires the exact student email. It removes the account,
personal workspace, memberships and study data and invalidates existing tokens.
Financial receipts and the admin audit are retained for reference. Admin accounts
cannot be deleted through student actions. A school-workspace owner must transfer
ownership before deletion. The student and payment tables have bounded internal
scroll areas with sticky headers; student-list first/last buttons scroll only the
student panel. Printing expands the complete tables.

The dashboard reads MongoDB, including existing test accounts, and excludes admins.
City and plan filters apply together to counts, charts, text analysis, tables,
CSV and the printable report. The date range applies to completed payments and
new accounts; account status counts describe the present. Historical income uses
the payment's plan, while account counts use each student's current plan. Missing
legacy cities appear as unspecified until the student supplies one. Date grouping
uses Asia/Jerusalem. Demo amounts and real revenue are separate; neither is net profit.
No observations produces zero counts and empty charts, never fabricated data.

CSV is generated on demand from the database rather than used as the primary
student store. The print button supports the browser's Save as PDF option.
The written analysis is computed in code and does not require an AI model.

The payment table includes each current student's name/email, plan, amount,
payment date/time, demo/real badge and selectable receipt reference. Receipts are
sorted newest first without changing report filters or totals. Arabic cells stay
right-aligned; amounts and references use isolated LTR spans inside those cells
so they line up with their headers. Column widths and sticky headings remain
stable inside the table's scroll region.

Academic stream is also available as a combined report filter, chart, analysis
note and CSV/table column. Unknown legacy streams have their own filter option.
The email search directly above the student table filters that table immediately;
it does not change the report charts. Use the top email filter to filter the report.

For the local demo, `node backend/scripts/seedDemoStudents.js` creates exactly 100
synthetic students with personal workspaces and fictional receipts. Their emails
use `@nipras-seed.example.invalid` and their names start with `تجربة -`.
The generated credentials and retry manifest live in ignored `.local/demo-students.json`.
Distribution is intentionally uneven across six cities (Jerusalem, Ramallah,
Nablus, Hebron, Jenin and Gaza), six streams, four plans and different access states.
All synthetic receipts are marked demo; they never count as real revenue.
Normal reruns do not add duplicate accounts. `--redistribute` explicitly replaces
only this synthetic batch's profiles and synthetic receipts with a fresh sample.
The script refuses production and remote MongoDB connections.

The site uses locally bundled Tajawal font weights, including login fields,
headings and Latin text. No Google Fonts request is required.

Run the billing database integration tests separately with a dedicated test database:

```powershell
$env:NODE_ENV='test'
$env:MONGO_URI_TEST='mongodb://127.0.0.1:27017/nipras_billing_test'
node --test backend/tests/billing.test.js
```

## Generated study schedules

`shared/studySchedule.js` owns versioned, deterministic project rules. Each lesson
requires 20 base minutes plus 10 minutes per provisional difficulty point (30–70
minutes). Difficulty values are fixed in `shared/studyLessonDifficulty.js`.
The five activities are explanation, example, practice, quiz/error review, summary.
Their V/A/R/K weights are respectively [40,25,15,10,10], [40,15,20,15,10],
[25,15,20,15,25], [15,25,35,15,10]. All saved scores contribute proportionally;
zero scores use equal modality shares. Integer minute allocation uses largest
remainders, so totals remain exact. These are adjustable project heuristics, not
official VARK percentages or fixed assessments of a student's abilities.

Canonical catalog order preserves lesson sequence. Weekly allocation partitions
that sequence over selected days with approximately balanced estimated workload;
no hours or detailed breaks are claimed until a daily schedule is prepared.
Daily scheduling uses only validated windows, merges adjacent windows, and inserts
a five-minute break after forty continuous study minutes when more work fits.
Activity offsets prevent double-counting when a lesson continues in another session.
Unscheduled activity portions remain explicit, rather than reducing their duration.
Required break time in the UI is an estimate for continuous study; actual breaks
are calculated from the available windows and shown separately.

Each StudyPlan retains preferences and a generated snapshot (sessions, breaks,
activities, lesson metadata, scores, rule version, full rule values and timestamps).
Generation always reads the owner's saved completed assessment; browser-supplied
scores, activities and durations are ignored. Generation and preference updates
use a revision compare-and-swap. Retried save keys have a unique owner-scoped
index; generation retries reuse the saved result and never create another plan.
A revised preference marks the old schedule stale until confirmed replacement
succeeds. Weekly edits cannot silently invalidate linked daily preferences.

Resource cards are derived presentation data. Previews have no media files,
questions, grades, completion events or viewing records. Their displayed minutes
are scheduled activity minutes, never actual file durations. All five preview
kinds open and explicitly say educational content will be added later.

Scheduling validation:

```powershell
node --test backend/tests/studyPlans.test.js backend/tests/studySchedule.test.js
$env:NODE_ENV='test'
$env:MONGO_URI_TEST='mongodb://127.0.0.1:27017/nipras_schedule_test'
node --test backend/tests/studyGenerationDb.test.js
```

# NIPRAS Signup and Workspace Foundation Design

## Goal

Give every new NIPRAS student a permanent NIPRAS ID and a personal workspace, while allowing an optional second membership in a school workspace. This adds no billing, subscription, analytics, or administration product surface.

## Existing architecture found

The client is a React 18/Vite application using React Router, Tailwind, i18next, and a small `apiRequest` wrapper. It has a separate Express 4 API using MongoDB/Mongoose, JWT bearer tokens, and bcryptjs. The browser does not access MongoDB or an AI provider directly. Most student pages still use mock data; only material and auth service wrappers target the API.

`POST /api/auth/signup` already normalizes email, uses bcrypt with cost 12, and hides `passwordHash` through the User JSON transform. However, the signup page only performs client-side validation then navigates locally, and the login page accepts one hard-coded credential. The auth context is memory-only and is not used by routes. The API mounts only auth and material routes, has no request-validation layer, does not mount its existing error middleware, and allows all CORS origins.

## Scope and non-goals

Implement only the account, workspace, membership, optional school-code join, safe current-workspace response, controlled school provisioning, and supporting authentication integration required to make registration real. Keep MongoDB/Mongoose and the Arabic RTL UI.

Do not build billing, plans, Stripe, analytics, seat management, an admin dashboard, school management UI, feature entitlements, microservices, PostgreSQL, or an application-wide conversion of existing user-owned resources to workspace-owned resources.

## Data model

`User` keeps MongoDB `_id` as the internal identifier and adds immutable, unique, indexed `niprasId`. It keeps `fullName`, normalized unique email, `passwordHash`, existing academic profile fields, and `status: ACTIVE | INACTIVE`.

`Counter` has `{ name: String, sequence: Number }` with a unique `name`. A single atomic `$inc` for `name: "niprasUser"` produces the next sequence. The service formats it as `NIP-${String(sequence).padStart(7, "0")}`. The unique User index remains the final collision protection.

`Workspace` has `{ name, type, ownerId, status, identifier, slug?, joinCode?, createdAt, updatedAt }`. `type` is `PERSONAL` or `SCHOOL`; `status` is `ACTIVE` or `INACTIVE`. `identifier` is unique; `slug` and `joinCode` are sparse unique values so personal workspaces do not consume either index. Join codes are normalized to uppercase before storage and lookup and are never accepted as an arbitrary workspace ID.

`Membership` has `{ userId, workspaceId, role, memberNumber?, status, joinedAt }`. Its compound unique index on `{ userId, workspaceId }` prevents duplicate memberships. Roles are `OWNER`, `SCHOOL_ADMIN`, `TEACHER`, and `STUDENT`; roles never become a global User property.

## Registration and school join behavior

`POST /api/auth/signup` accepts `{ fullName, email, password, stream?, grade?, schoolCode? }`. It validates and normalizes the values, checks the email, hashes the password, allocates the permanent NIPRAS ID, creates a user, creates `${fullName}'s Workspace` as a `PERSONAL` workspace, and creates its `OWNER` membership. If `schoolCode` is present, it then resolves an active school by the normalized code and adds a `STUDENT` membership. An invalid code rejects the whole registration; it must not leave a partially created user.

The service attempts the three-document registration in a MongoDB transaction. On a standalone MongoDB deployment where transactions are unavailable, it uses a compensating cleanup path that deletes the newly created membership, workspace, and user before returning `REGISTRATION_FAILED`. Existing users and counters are never removed. Duplicate email and duplicate membership database errors become safe application error codes.

The response creates the existing JWT session and returns a safe auth payload:

```json
{
  "user": { "id": "...", "niprasId": "NIP-0000001", "fullName": "Ahmad", "email": "ahmad@example.com" },
  "workspaces": [{ "id": "...", "name": "حسابي الشخصي", "type": "PERSONAL", "role": "OWNER" }],
  "currentWorkspace": { "id": "...", "type": "PERSONAL", "role": "OWNER" },
  "token": "..."
}
```

`GET /api/auth/me` and `GET /api/workspaces` return the same safe workspace projection. `POST /api/schools/join` accepts only `{ schoolCode }`, resolves the school server-side, and creates one `STUDENT` membership. A membership middleware resolves a requested workspace from a trusted route parameter or header only after finding an active membership for `req.user._id`; it will be used by the new workspace routes and is the required pattern for later school-owned routes.

There is no public school-creation endpoint. A small authenticated-free but operator-controlled CLI script calls the school service and receives all values through command-line arguments and environment configuration. It validates the owner user, creates the school workspace, and creates a `SCHOOL_ADMIN` membership. This keeps ordinary student signup unable to create schools.

## Frontend behavior

The existing Arabic signup form remains visually intact. It gets an optional disclosure, `لدي رمز مدرسة`, that reveals a `رمز المدرسة` field. Submission calls the existing auth service, updates the auth context, and navigates to the normal application route only after the API succeeds. The client stores no roles supplied by the student and displays no workspace/tenant terminology. The login screen is changed only enough to call the existing login endpoint and establish the same auth context, so accounts created today can later sign in.

## Error and security behavior

Validation is in a dedicated authentication-validation module. Controllers orchestrate request/response only; registration, workspace creation, ID allocation, and school joining live in focused services. A small `ApiError` carries safe code/message/status values. The central handler is mounted after all routes, hides stack traces and Mongoose internals, and maps duplicate-key, JWT, and malformed ObjectId errors. Password hashes and school join codes are not returned in API DTOs.

## SaaS audit

### Good

- Client and API are already separate; no browser code imports Mongoose or an AI credential.
- Mongoose schemas hold the current data model instead of route-local database definitions.
- Passwords are hashed with bcrypt cost 12 and `passwordHash` is excluded by default from JSON.
- JWT signing is isolated in `tokenService`; Mongo connection strings are sanitized before logging.
- Existing user-owned material queries include the authenticated user ID.

### Needs improvement addressed by this feature

- Signup and login UIs bypass the API and authentication context.
- User identity has no permanent human-friendly NIPRAS ID.
- There is no tenant/workspace or membership model, so school access cannot be authorized safely.
- Signup has no transaction or cleanup protection against partial writes.
- Authentication input validation and safe error codes are duplicated/ad hoc.
- The existing error middleware is not mounted.
- The API has no backend test command or API test isolation.

### TODO / future SaaS improvement

- Add `workspaceId` to materials, analyses, lectures, quizzes, chats, plans, and progress when those resources become school-shareable; current owner-only models must not be treated as school-scoped.
- Replace permissive CORS with a configured origin allowlist, add rate limiting, password-reset delivery, token rotation or secure HTTP-only cookies, request logging, audit logs, and production monitoring.
- Add school-admin UI, invitation lifecycle, member-number issuance rules, school analytics, teacher/parent roles, entitlement checks, billing, subscriptions, usage metering, and Stripe.
- Add a dedicated MongoDB test deployment/replica set for transaction and concurrency integration tests, CI, backup/recovery processes, and structured observability.

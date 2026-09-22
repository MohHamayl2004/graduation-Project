# NIPRAS Workspace and Organization Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real NIPRAS signup with an immutable NIPRAS ID, a personal workspace and owner membership, plus optional school joining secured by membership checks.

**Architecture:** Retain the existing React/Vite client and Express/Mongoose API. Add three focused models (`Workspace`, `Membership`, `Counter`) and small services for ID allocation, registration, and school joining. The existing auth API becomes the single registration/login boundary; its response provides safe current-workspace context without a workspace-switcher UI.

**Tech Stack:** React 18, Vite 5, React Router 6, i18next, Express 4, MongoDB/Mongoose 8, bcryptjs, jsonwebtoken, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-22-signup-workspace-foundation-design.md`

## What Exists Today

- `src/` is a React RTL client. `src/services/api.js` calls the Express API; the client does not directly connect to MongoDB or protected AI services.
- `backend/` is an Express/Mongoose API. It already uses bcrypt cost 12, JWT bearer tokens, `User.passwordHash` with `select: false`, and a JSON transform that removes password hashes.
- `backend/controllers/authController.js` supports API signup/login, but `src/pages/Signup/index.jsx` only validates locally and navigates to `/analysis`; `src/pages/Login/index.jsx` accepts a hard-coded credential.
- `backend/models/User.js` has `fullName`, normalized unique email, password hash, academic fields, and timestamps, but no NIPRAS ID/status. No workspace or membership models exist.
- The API mounts auth and materials routes only. Existing error middleware is not mounted, CORS is permissive, and there is no backend test script. The root frontend tests are Node source checks.

## What Must Not Change

- MongoDB/Mongoose remains the database layer.
- The homepage, Arabic RTL behavior, AI tutor UI, lessons, quizzes, routes, current styling, existing integrations, and current MongoDB connection setup remain intact.
- No billing, subscriptions, Stripe, plans, analytics, school administration dashboard, complete teacher permissions, separate databases, microservices, PostgreSQL, RAG tenant migration, or AI redesign is added.
- Existing user-owned models (`Material`, `Analysis`, `Lecture`, `Quiz`, `AIChat`, `StudyPlan`, `Progress`) are not converted to workspace-scoped models in this feature. Their future workspace scoping is documented only.

## File Structure

### Create

- `backend/errors/ApiError.js` — safe application error type with status, stable code, and user-facing message.
- `backend/app.js` — creates the Express application, mounts routes, and installs the central error boundary; it does not connect MongoDB or call `listen`.
- `backend/validation/authValidation.js` — validates and normalizes signup, login, and school-code payloads.
- `backend/models/Counter.js` — persists atomic NIPRAS ID sequences only.
- `backend/models/Workspace.js` — persists personal/school workspaces and their indexes only.
- `backend/models/Membership.js` — persists user-to-workspace roles and status only.
- `backend/services/niprasIdService.js` — atomically allocates formatted permanent NIPRAS IDs only.
- `backend/services/workspaceService.js` — creates safe workspace/member projections and controlled school workspaces only.
- `backend/services/registrationService.js` — orchestrates user, personal workspace, owner membership, and optional school membership creation.
- `backend/controllers/workspaceController.js` — sends authenticated workspace-list responses only.
- `backend/controllers/schoolController.js` — accepts a school code and joins the authenticated user only.
- `backend/routes/workspaceRoutes.js` — authenticated workspace routes only.
- `backend/routes/schoolRoutes.js` — authenticated school-join route only.
- `backend/middleware/workspaceMembershipMiddleware.js` — resolves a workspace only after active membership verification.
- `backend/scripts/createSchool.js` — controlled operator CLI for a school workspace and `SCHOOL_ADMIN` membership; never exposed to public signup.
- `backend/scripts/backfillNiprasIds.js` — idempotent operator CLI that calls the shared allocator for legacy Users that lack `niprasId`.
- `backend/tests/app.test.js` — HTTP API boundary/error tests using Supertest.
- `backend/tests/registration.test.js` — registration, ID, workspace, and membership integration tests.
- `backend/tests/workspace.test.js` — join and authorization integration tests.
- `backend/tests/helpers/testDatabase.js` — connects suites to `MONGO_URI_TEST`, clears only test collections, and disconnects afterward.
- `tests/signup-workspace-ui.test.mjs` — signup UI/API integration source checks consistent with existing frontend tests.

### Modify

- `backend/models/User.js` — add immutable, unique indexed `niprasId` and `status`; preserve fields and password JSON protections.
- `backend/controllers/authController.js` — delegate registration/login to validation/services and return safe auth/workspace context.
- `backend/routes/authRoutes.js` — retain paths and register unchanged auth route names.
- `backend/middleware/errorMiddleware.js` — map expected validation, JWT, duplicate-key, and ObjectId errors to safe `{ code, message }` responses.
- `backend/server.js` — start the extracted app after connecting MongoDB.
- `backend/package.json` — add Supertest as the HTTP API test development dependency and a Node test command; do not add a test framework.
- `backend/package-lock.json` — records the Supertest development dependency.
- `backend/.env.example` — document only required/auth test configuration placeholders.
- `src/context/AuthContext.jsx` — hold `{ user, token, workspaces, currentWorkspace }` and safe sign-in/sign-out helpers.
- `src/services/authService.js` — preserve auth endpoints and add `getWorkspaces(token)` / `joinSchool(payload, token)` wrappers.
- `src/pages/Signup/index.jsx` — submit to the API, show safe errors/loading, and reveal optional school code in Arabic.
- `src/pages/Login/index.jsx` — replace only the hard-coded credential behavior with the existing API call and auth context update.
- `src/locales/ar/auth.json` — add the Arabic labels/errors for optional school code and registration state.

## Final Data Model

```js
// User additions; `_id`, fullName, email, passwordHash, grade, stream,
// language, avatarUrl, createdAt, updatedAt remain from the existing schema.
{ niprasId: "NIP-0000001", status: "ACTIVE" }

// Counter
{ name: "niprasUser", sequence: 1 }

// Workspace
{
  name: "حساب أحمد الشخصي",
  type: "PERSONAL", // or SCHOOL
  ownerId: ObjectId,
  joinCode: undefined,
  status: "ACTIVE",
  createdAt: Date,
  updatedAt: Date
}

// Membership
{
  userId: ObjectId,
  workspaceId: ObjectId,
  role: "OWNER", // OWNER | SCHOOL_ADMIN | TEACHER | STUDENT
  memberNumber: undefined, // reserved; not generated in this iteration
  status: "ACTIVE",
  joinedAt: Date
}
```

`memberNumber` is reserved for a future school-controlled numbering policy. This iteration never generates it; new school memberships leave it `undefined`, matching the existing optional-field schema convention.

Indexes: `User.niprasId` unique, `User.email` unique; `Counter.name` unique; `Workspace.joinCode` sparse unique; `Membership { userId, workspaceId }` compound unique. No slug or redundant identifier is added because this feature has no product use for either.

`niprasId` rollout is phased for the populated MongoDB database: first add the optional schema field and a sparse unique index; run the idempotent backfill; verify no expected User lacks a value; then replace the sparse index with the final unique index and make `niprasId` required for new writes. A brand-new empty database may use the final required/unique configuration immediately. Existing login fields, profile fields, and password hashes are not changed by this rollout.

## API Contracts

```http
POST /api/auth/signup
{ "fullName", "email", "password", "stream?", "grade?", "schoolCode?" }

POST /api/auth/login
{ "email", "password" }

GET /api/auth/me
GET /api/workspaces
POST /api/schools/join
{ "schoolCode" }
```

`GET /api/auth/me` already exists in `backend/routes/authRoutes.js`, uses `protect`, and reads identity from the JWT. This plan preserves that endpoint and extends its safe response to `{ user, workspaces, currentWorkspace }`; it never accepts a browser-supplied user ID and does not return a token.

Successful auth responses contain `{ user, token, workspaces, currentWorkspace }`. User DTOs contain `_id`/`id`, `niprasId`, `fullName`, email, and existing safe profile fields only. Workspace DTOs contain `id`, `name`, `type`, `role`, `memberNumber`, and status; they never contain `joinCode`. Failures use safe codes: `VALIDATION_ERROR`, `EMAIL_ALREADY_EXISTS`, `INVALID_SCHOOL_CODE`, `ALREADY_MEMBER`, `WORKSPACE_ACCESS_DENIED`, `AUTH_INVALID`, and `REGISTRATION_FAILED`.

## Global Constraints

- Use an atomic MongoDB `$inc` counter, never `countDocuments() + 1`. Counter values are monotonic: an allocated value is never decremented, rolled back, or reused, including after a failed registration.
- Registration first normalizes input, checks duplicate email, and validates any supplied school code. Only then does it allocate a NIPRAS ID, create the User, create the personal workspace and its `OWNER` membership, and add a `STUDENT` membership for a previously validated school.
- Roles are on Membership, never User.
- Browser-supplied workspace IDs/roles prove nothing. Future workspace-owned routes must run `requireActiveMembership(getWorkspaceId)` and verify active `{ userId, workspaceId, status: "ACTIVE" }` membership before accessing their resource.
- Attempt a MongoDB transaction for multi-document registration. If the configured topology does not support transactions, delete only records created by that failed registration attempt; never delete pre-existing records or decrement the Counter.
- Keep frontend school participation optional and use Arabic student-facing wording rather than tenant/workspace terminology.
- Default `currentWorkspace` to the authenticated user's PERSONAL workspace after signup, login, and `/api/auth/me`; do not add persisted switching or `activeWorkspaceId` to User.
- Database integration tests require `MONGO_URI_TEST` and `NODE_ENV=test`; they never fall back to `MONGO_URI`. Before clearing known test collections, the helper must verify the resolved database name contains `test` (case-insensitive) and reject all other names.

## Review Focus

- Parallel registration must allocate distinct permanent IDs.
- Invalid school code during signup must not create a counter, consume an ID, or leave a partial account, personal workspace, or membership.
- Duplicate school join must preserve the original NIPRAS ID and add no membership.
- Direct middleware tests must confirm a non-member receives `WORKSPACE_ACCESS_DENIED` and that `next()` is not called.
- Password hashes, join codes, and database internals must never appear in responses.

---

### Task 1: Establish testable API errors and request validation

**Files:** Create `backend/errors/ApiError.js`, `backend/app.js`, `backend/validation/authValidation.js`, `backend/tests/app.test.js`, `backend/tests/helpers/testDatabase.js`; modify `backend/server.js`, `backend/middleware/errorMiddleware.js`, `backend/package.json`, `backend/package-lock.json`.

**Produces:** `createApp()`, `ApiError`, `validateSignupInput`, `validateLoginInput`, and `validateSchoolJoinInput` for all later routes.

- [ ] **Step 1: Write failing tests for safe missing-route and validation responses.**

```js
import request from "supertest";

test('unknown API route responds with no stack trace', async () => {
  const response = await request(createApp()).get('/api/missing');
  assert.equal(response.status, 404);
  assert.equal(response.body.code, 'NOT_FOUND');
  assert.equal('stack' in response.body, false);
});

test('signup validator normalizes email and school code', () => {
  assert.deepEqual(validateSignupInput({ fullName: ' أحمد ', email: ' A@EXAMPLE.COM ', password: '12345678', schoolCode: ' ens-123 ' }), {
    fullName: 'أحمد', email: 'a@example.com', password: '12345678', stream: undefined, grade: undefined, schoolCode: 'ENS-123'
  });
});

test('test database guard rejects missing URI, non-test mode, and non-test database names', async () => {
  await assert.rejects(() => connectTestDatabase({}), /MONGO_URI_TEST is required/);
  await assert.rejects(() => connectTestDatabase({ MONGO_URI_TEST: 'mongodb://127.0.0.1/nipras_test', NODE_ENV: 'development' }), /NODE_ENV=test is required/);
  await assert.rejects(() => connectTestDatabase({ MONGO_URI_TEST: 'mongodb://127.0.0.1/nipras', NODE_ENV: 'test' }), /non-test database/);
});
```

- [ ] **Step 2: Add Supertest as the only HTTP API test dependency, using the backend's ESM module style.**

```powershell
npm --prefix backend install --save-dev supertest
```

HTTP tests import it as `import request from "supertest";`. Add exactly `"test": "node --test tests/*.test.js"` to `backend/package.json`. Database-backed tests receive their isolated connection through `MONGO_URI_TEST` in `tests/helpers/testDatabase.js`; no second database-test command is created.

- [ ] **Step 3: Run `npm --prefix backend test`; confirm it fails because the app and validator do not exist.**
- [ ] **Step 4: Implement the focused error type, validators, extracted app factory, mounted `notFound`/`errorHandler`, test helper, and test script. `connectTestDatabase(env)` must read only `env.MONGO_URI_TEST`, require `env.NODE_ENV === 'test'`, parse the database name from that URI, require `/test/i`, and only then clear known test collections. It must never call `dropDatabase()` before these checks and never read `MONGO_URI` as fallback.**
- [ ] **Step 5: Run `npm --prefix backend test`; confirm safe errors and validation pass.**
- [ ] **Step 6: Commit:** `git add backend && git commit -m "feat: add safe API validation boundary"`.

### Task 2: Add permanent identity and tenant persistence models

**Files:** Create `backend/models/Counter.js`, `backend/models/Workspace.js`, `backend/models/Membership.js`, `backend/services/niprasIdService.js`, `backend/scripts/backfillNiprasIds.js`; modify `backend/models/User.js`; extend `backend/tests/registration.test.js`.

**Produces:** `allocateNiprasId({ session })`, `backfillNiprasIds() -> Promise<{ scanned, updated }>`, `Workspace`, `Membership`, and `User.niprasId` / `User.status` fields.

- [ ] **Step 1: Write failing persistence tests.**

```js
test('atomic allocator returns distinct seven-digit NIPRAS IDs in parallel', async () => {
  const ids = await Promise.all(Array.from({ length: 25 }, () => allocateNiprasId()));
  assert.equal(new Set(ids).size, 25);
  assert.ok(ids.every((id) => /^NIP-\d{7}$/.test(id)));
});

test('membership index rejects duplicate user/workspace pairs', async () => {
  await Membership.create({ userId, workspaceId, role: 'STUDENT' });
  await assert.rejects(() => Membership.create({ userId, workspaceId, role: 'STUDENT' }), { code: 11000 });
});

test('backfill assigns only missing IDs and is idempotent', async () => {
  const legacy = await User.create({ ...legacyUser, passwordHash });
  const assigned = await User.create({ ...assignedUser, niprasId: 'NIP-0000042', passwordHash });
  assert.deepEqual(await backfillNiprasIds(), { scanned: 2, updated: 1 });
  const afterFirstRun = await User.findById(legacy._id).select('+passwordHash');
  const unchanged = await User.findById(assigned._id).select('+passwordHash');
  assert.match(afterFirstRun.niprasId, /^NIP-\d{7}$/);
  assert.equal(afterFirstRun.passwordHash, passwordHash);
  assert.equal(unchanged.niprasId, 'NIP-0000042');
  assert.deepEqual(await backfillNiprasIds(), { scanned: 2, updated: 0 });
});

```

- [ ] **Step 2: Run backend tests against `MONGO_URI_TEST`; confirm the tests fail before models/services exist.**
- [ ] **Step 3: Implement exact fields/indexes and `findOneAndUpdate({ name: 'niprasUser' }, { $inc: { sequence: 1 } }, { new: true, upsert: true, session })`. Format with `padStart(7, '0')`; never issue `$inc: { sequence: -1 }`. Implement `backfillNiprasIds()` with `User.find({ $or: [{ niprasId: { $exists: false } }, { niprasId: null }] }).select('+passwordHash')`; allocate through the shared allocator, update only the selected missing field, return `{ scanned, updated }`, and log only aggregate counts.**
- [ ] **Step 4: Run tests for unique IDs, unique membership, migration format/uniqueness/idempotence, preserved password/profile fields, unchanged preassigned IDs, and shared monotonic Counter. Counter-gap behavior is tested with registration only after registration exists in Task 3.**
- [ ] **Step 5: Commit:** `git add backend/models backend/services backend/tests && git commit -m "feat: add NIPRAS workspace models"`.

### Task 3: Implement atomic signup with personal workspace creation

**Files:** Create `backend/services/registrationService.js`; modify `backend/controllers/authController.js`, `backend/routes/authRoutes.js`; extend `backend/tests/registration.test.js`.

**Produces:** `registerStudent(input, { createPersonalWorkspace } = {})` and auth responses with safe user/workspace context. The optional service override exists only to force an after-allocation failure in the integration test; production callers invoke `registerStudent(input)`.

- [ ] **Step 1: Write failing independent-signup tests.**

```js
test('independent signup creates an active user, personal workspace, and owner membership', async () => {
  const response = await request(app).post('/api/auth/signup').send(validStudent);
  assert.equal(response.status, 201);
  assert.match(response.body.user.niprasId, /^NIP-\d{7}$/);
  assert.equal(response.body.workspaces.length, 1);
  assert.deepEqual(response.body.currentWorkspace.type, 'PERSONAL');
  assert.equal(response.body.currentWorkspace.role, 'OWNER');
  assert.equal('passwordHash' in response.body.user, false);
});

test('duplicate email returns EMAIL_ALREADY_EXISTS', async () => {
  await request(app).post('/api/auth/signup').send(validStudent);
  const response = await request(app).post('/api/auth/signup').send(validStudent);
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'EMAIL_ALREADY_EXISTS');
});

test('duplicate email is rejected before NIPRAS ID allocation', async () => {
  await request(app).post('/api/auth/signup').send(validStudent);
  const before = await Counter.findOne({ name: 'niprasUser' }).lean();
  await request(app).post('/api/auth/signup').send(validStudent);
  const after = await Counter.findOne({ name: 'niprasUser' }).lean();
  assert.equal(after.sequence, before.sequence);
});
```

- [ ] **Step 2: Run the registration tests; confirm they fail before `registerStudent` exists.**
- [ ] **Step 3: Implement this exact order: normalize/validate input; check duplicate email; normalize and resolve any supplied active school; throw `INVALID_SCHOOL_CODE` and stop if it is absent; only then allocate the NIPRAS ID. Invalid school-code signup must not create a Counter, consume an ID, create a User, PERSONAL Workspace, OWNER Membership, or school membership.**
- [ ] **Step 4: Allocate the counter outside the transaction/compensation unit after prevalidation, so an allocated ID remains permanently consumed. Then run a transaction callback that creates User, personal Workspace, OWNER Membership, and optional school STUDENT Membership as one operation. Add a narrowly scoped standalone-server fallback that records IDs it created and deletes only those records on failure. It must never delete pre-existing documents and must never decrement the Counter.**
- [ ] **Step 5: Add failing tests for the two distinct failure paths, then implement and rerun the suite.**

```js
test('invalid signup school code leaves the counter and all registration collections unchanged', async () => {
  const before = await Counter.findOne({ name: 'niprasUser' }).lean();
  const response = await request(app).post('/api/auth/signup').send({ ...validStudent, schoolCode: 'UNKNOWN' });
  const after = await Counter.findOne({ name: 'niprasUser' }).lean();
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_SCHOOL_CODE');
  assert.equal(after?.sequence, before?.sequence);
  assert.equal(await User.countDocuments({ email: validStudent.email }), 0);
  assert.equal(await Workspace.countDocuments(), 0);
  assert.equal(await Membership.countDocuments(), 0);
});

test('a failure after allocation leaves an allowed, never-reused NIPRAS ID gap', async () => {
  const first = await registerStudent(validStudent);
  await assert.rejects(
    () => registerStudent(anotherStudent, { createPersonalWorkspace: async () => { throw new Error('forced workspace failure'); } }),
    { code: 'REGISTRATION_FAILED' }
  );
  const third = await registerStudent(thirdStudent);
  assert.equal(Number(third.user.niprasId.slice(4)), Number(first.user.niprasId.slice(4)) + 2);
  assert.equal(await User.countDocuments({ email: anotherStudent.email }), 0);
  assert.equal(await Workspace.countDocuments({ ownerId: { $ne: first.user.id } }), 1);
});
```

- [ ] **Step 6: Add tests for the existing protected `GET /api/auth/me`: a valid token returns safe `{ user, workspaces, currentWorkspace }` with PERSONAL current workspace, and no token returns `AUTH_INVALID`/401 without a stack trace. Update `me` and its response helper without changing its path or creating a second current-user endpoint.**

- [ ] **Step 7: Commit:** `git add backend && git commit -m "feat: create personal workspace on signup"`.

### Task 4: Add school provisioning, optional join, and membership authorization

**Files:** Create `backend/services/workspaceService.js`, `backend/controllers/workspaceController.js`, `backend/controllers/schoolController.js`, `backend/routes/workspaceRoutes.js`, `backend/routes/schoolRoutes.js`, `backend/middleware/workspaceMembershipMiddleware.js`, `backend/scripts/createSchool.js`, `backend/tests/workspace.test.js`; modify `backend/app.js`, `backend/services/registrationService.js`.

**Produces:** controlled school provisioning; `POST /api/schools/join`; `GET /api/workspaces`; `requireActiveMembership(getWorkspaceId)`, where `getWorkspaceId(req)` returns the requested workspace ID and the middleware returns `(req, res, next)`.

- [ ] **Step 1: Write failing join/authorization tests.**

```js
test('signup with a valid school code retains personal workspace and adds a student membership', async () => {
  const response = await request(app).post('/api/auth/signup').send({ ...validStudent, schoolCode: school.joinCode });
  assert.equal(response.status, 201);
  assert.equal(response.body.workspaces.length, 2);
  assert.ok(response.body.workspaces.some((workspace) => workspace.type === 'PERSONAL' && workspace.role === 'OWNER'));
  assert.ok(response.body.workspaces.some((workspace) => workspace.id === String(school._id) && workspace.role === 'STUDENT'));
});

const createResponseRecorder = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

test('membership middleware rejects a requested school when the user has no active membership', async () => {
  const middleware = requireActiveMembership((req) => req.params.workspaceId);
  const req = { user: unrelatedUser, params: { workspaceId: String(school._id) } };
  const res = createResponseRecorder();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'WORKSPACE_ACCESS_DENIED');
  assert.equal(nextCalled, false);
});
```

- [ ] **Step 2: Run tests; confirm no join route/membership guard exists yet.**
- [ ] **Step 3: Implement the controlled CLI (`--ownerEmail`, `--name`, `--joinCode`), active-school lookup by normalized code, duplicate prevention, safe list DTOs, and membership middleware. Do not add public school creation or any additional public workspace route.**
- [ ] **Step 4: Add and pass tests for an invalid code after signup (`INVALID_SCHOOL_CODE`) leaving the existing account/workspaces/memberships unchanged; joining twice (`ALREADY_MEMBER`); unchanged `niprasId`; no `joinCode` in responses; and direct middleware denial for a non-member.**
- [ ] **Step 5: Commit:** `git add backend && git commit -m "feat: add school membership foundation"`.

### Task 5: Connect the Arabic signup and login screens to authenticated API state

**Files:** Modify `src/context/AuthContext.jsx`, `src/services/authService.js`, `src/pages/Signup/index.jsx`, `src/pages/Login/index.jsx`, `src/locales/ar/auth.json`; create `tests/signup-workspace-ui.test.mjs`.

**Produces:** API-backed signup/login and context state `{ user, token, workspaces, currentWorkspace }`; no workspace UI redesign.

- [ ] **Step 1: Write a failing UI source test.**

```js
test('signup submits optional school code through the auth API', async () => {
  const source = await readFile(new URL('../src/pages/Signup/index.jsx', import.meta.url), 'utf8');

  assert.match(source, /schoolCode/);

  assert.match(
    source,
    /await\s+signup\s*\(/
  );

  assert.match(
    source,
    /signIn\s*\(\s*response\s*\)/
  );

  assert.doesNotMatch(
    source,
    /navigate\s*\(\s*["']\/analysis["']\s*\)/
  );
});
```

- [ ] **Step 2: Run `npm test`; confirm the new test fails before UI/API wiring.**
- [ ] **Step 3: Add an optional Arabic disclosure and `رمز المدرسة` input. Preserve fields/design; submit only validated API payloads, show returned safe errors, disable double submission, update context on success, then navigate.**
- [ ] **Step 4: Replace Login’s hard-coded account condition with `const response = await login({ email, password })`, then `signIn(response)`, using the same context update and API error display. Do not add OAuth or a second auth system.**
- [ ] **Step 5: Run `npm test` and `npm run build`; confirm existing login, landing, logo, and video tests still pass.**
- [ ] **Step 6: Commit:** `git add src tests && git commit -m "feat: connect signup to workspace foundation"`.

### Task 6: Document configuration and verify the complete foundation

**Files:** Modify `backend/.env.example`, `README.md` if present or create it, and the linked design document.

**Produces:** reproducible setup for development and test MongoDB; explicit future SaaS work list.

- [ ] **Step 1: Add a failing static test that requires `MONGO_URI_TEST` and `JWT_SECRET` in `backend/.env.example`.**
- [ ] **Step 2: Run it; confirm the current template lacks the test database variable.**
- [ ] **Step 3: Document backend/frontend startup, `MONGO_URI_TEST`/`NODE_ENV=test`/test-database-name protection, the phased sparse-index/backfill/final-index rollout, `backfillNiprasIds.js`, the need for a MongoDB replica set to exercise transactions, standalone compensation behavior, controlled school CLI usage, and all intentionally deferred SaaS work. Do not commit real secrets.**
- [ ] **Step 4: Run fresh verification:**

```powershell
npm test
npm run build
npm --prefix backend test
```

- [ ] **Step 5: Manually verify independent signup, signup with an operator-created school code, invalid signup code atomic failure, later invalid school join leaving the existing account untouched, duplicate join rejection, and login. Verify non-member middleware behavior through the automated direct middleware test; no extra public context endpoint exists.**
- [ ] **Step 6: Commit:** `git add backend/.env.example README.md docs && git commit -m "docs: document NIPRAS workspace foundation"`.

## Future SaaS Work

- Apply `workspaceId` scoping to materials, analyses, lessons, quizzes, chat, study plans, and progress once those are intentionally shared within schools.
- Configured CORS allowlists, rate limits, secure HTTP-only cookie sessions/token rotation, password reset, structured logging, audit logs, monitoring, backup/recovery, CI, and a dedicated transaction-capable test database.
- School administration UI, invitations, teacher/parent workflows, member-number allocation policy, analytics, entitlements, usage metering, billing, subscriptions, and Stripe.

## Plan Self-Review

Every required feature—permanent identity, personal workspace, membership roles, optional school joining, transaction/compensation safety, server-side authorization, Arabic UI preservation, and verification—has a task and concrete test. The API contract contains only `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/workspaces`, and `POST /api/schools/join`; school provisioning stays a controlled CLI. The backend test command is created in Task 1 and includes Supertest via the backend's ESM import style. The plan adds no unrelated SaaS system, database migration, or broad frontend redesign.

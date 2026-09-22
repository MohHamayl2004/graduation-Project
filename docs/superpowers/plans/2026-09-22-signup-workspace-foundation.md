# NIPRAS Signup and Workspace Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make student signup create a permanent NIPRAS identity, personal workspace, owner membership, and optional school membership in MongoDB.

**Architecture:** Keep React/Vite and Express/Mongoose separate. Add focused Mongoose models and services behind the existing JWT API, while using an atomic MongoDB counter for NIPRAS IDs and a transaction-or-compensation registration boundary. The existing Arabic signup UI calls this API and keeps workspace language out of the student-facing interface.

**Tech Stack:** React 18, Vite 5, React Router 6, Express 4, MongoDB/Mongoose 8, bcryptjs, jsonwebtoken, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-22-signup-workspace-foundation-design.md`

## Global Constraints

- Keep MongoDB/Mongoose; do not introduce PostgreSQL, billing, subscriptions, or a SaaS rewrite.
- A User may have many memberships; roles belong exclusively to Membership.
- Every student signup creates a personal workspace even when the student supplies a valid school code.
- Do not trust a browser-supplied workspace ID or role.
- Do not return password hashes, join codes, database stack traces, or secrets.
- Preserve Arabic RTL UI and existing application routes.

## Review Focus

- Two concurrent signups must not receive the same `niprasId`; test atomic counter allocation with parallel requests against the test database.
- A valid school code must add a second membership without changing the original NIPRAS ID; cover registration and later join.
- An invalid school code must leave no User, Workspace, or Membership behind.
- A user who is not an active member must receive a safe authorization failure for a school workspace request.
- Duplicate email and duplicate school membership must return stable safe error codes without a password hash in the response.

---

### Task 1: Create the API error, validation, and testable app boundary

**Files:**
- Create: `backend/errors/ApiError.js`
- Create: `backend/validation/authValidation.js`
- Create: `backend/app.js`
- Create: `backend/tests/app.test.js`
- Modify: `backend/server.js`
- Modify: `backend/middleware/errorMiddleware.js`
- Modify: `backend/package.json`

**Interfaces:**
- `validateSignupInput(payload)` returns normalized `{ fullName, email, password, stream, grade, schoolCode }` or throws `ApiError`.
- `createApp()` returns an Express app with `/api/auth`, `/api/workspaces`, and `/api/schools` routes, `notFound`, and `errorHandler`.

- [ ] **Step 1: Write failing API-boundary tests**

```js
test('unknown API route returns a safe NOT_FOUND response', async () => {
  const response = await request(createApp()).get('/api/missing');
  assert.equal(response.status, 404);
  assert.equal(response.body.code, 'NOT_FOUND');
  assert.equal('stack' in response.body, false);
});
```

- [ ] **Step 2: Run the test and confirm failure because the testable app boundary does not exist.**

- [ ] **Step 3: Implement `ApiError`, input normalization, app creation, and central error mapping.**

```js
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
```

- [ ] **Step 4: Run the backend test command and confirm the safe route/error behavior passes.**

- [ ] **Step 5: Commit the focused API boundary change.**

### Task 2: Add User identity, workspace, membership, and counter models

**Files:**
- Create: `backend/models/Counter.js`
- Create: `backend/models/Workspace.js`
- Create: `backend/models/Membership.js`
- Create: `backend/services/niprasIdService.js`
- Create: `backend/tests/models.test.js`
- Modify: `backend/models/User.js`

**Interfaces:**
- `allocateNiprasId({ session? })` atomically increments `Counter("niprasUser")` and returns `NIP-0000001` format.
- `Workspace` exports `PERSONAL` and `SCHOOL` types; `Membership` exports workspace roles and statuses.

- [ ] **Step 1: Write failing model and allocator tests.**

```js
test('parallel allocations return distinct padded NIPRAS IDs', async () => {
  const ids = await Promise.all(Array.from({ length: 20 }, () => allocateNiprasId()));
  assert.equal(new Set(ids).size, 20);
  assert.ok(ids.every((id) => /^NIP-\d{7}$/.test(id)));
});
```

- [ ] **Step 2: Run the isolated model tests and confirm they fail before the models exist.**

- [ ] **Step 3: Add schema validation and indexes.**

```js
membershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });
workspaceSchema.index({ joinCode: 1 }, { unique: true, sparse: true });
userSchema.index({ niprasId: 1 }, { unique: true });
```

- [ ] **Step 4: Run model tests and confirm atomic IDs, unique membership, and safe User JSON all pass.**

- [ ] **Step 5: Commit the model foundation.**

### Task 3: Implement registration and workspace services

**Files:**
- Create: `backend/services/registrationService.js`
- Create: `backend/services/workspaceService.js`
- Create: `backend/tests/registration.test.js`
- Modify: `backend/controllers/authController.js`
- Modify: `backend/routes/authRoutes.js`

**Interfaces:**
- `registerStudent(input)` returns `{ user, workspaces, currentWorkspace }` after creating the User, personal Workspace, and owner Membership.
- `joinSchoolWorkspace({ userId, schoolCode, session? })` returns the new `STUDENT` membership or throws `INVALID_SCHOOL_CODE` / `ALREADY_MEMBER`.
- `toAuthResponse(user)` returns only safe user fields plus `token`, workspaces, and current workspace.

- [ ] **Step 1: Write failing registration behavior tests.**

```js
test('independent registration creates user, personal workspace, and owner membership', async () => {
  const result = await registerStudent(validInput);
  assert.match(result.user.niprasId, /^NIP-\d{7}$/);
  assert.equal(result.workspaces[0].type, 'PERSONAL');
  assert.equal(result.workspaces[0].role, 'OWNER');
});
```

- [ ] **Step 2: Run the test and confirm it fails before the registration service exists.**

- [ ] **Step 3: Implement the transaction path and standalone-Mongo compensation path.**

```js
try {
  return await mongoose.connection.transaction(() => createRegistration(input));
} catch (error) {
  if (!isTransactionUnavailable(error)) throw error;
  return createRegistrationWithCleanup(input);
}
```

- [ ] **Step 4: Add failing tests for duplicate email, valid school code, invalid school code cleanup, and unchanged NIPRAS ID.**

- [ ] **Step 5: Implement error mapping and run all registration tests until they pass.**

- [ ] **Step 6: Commit the registration service and API wiring.**

### Task 4: Add controlled school provisioning, joining, workspace listing, and authorization middleware

**Files:**
- Create: `backend/controllers/schoolController.js`
- Create: `backend/controllers/workspaceController.js`
- Create: `backend/routes/schoolRoutes.js`
- Create: `backend/routes/workspaceRoutes.js`
- Create: `backend/middleware/workspaceMembershipMiddleware.js`
- Create: `backend/scripts/createSchool.js`
- Create: `backend/tests/workspaces.test.js`
- Modify: `backend/app.js`

**Interfaces:**
- `GET /api/workspaces` returns safe workspace/member projections for the authenticated user.
- `POST /api/schools/join` accepts `{ schoolCode }` only.
- `requireActiveMembership` resolves an active membership for the authenticated user and requested workspace before assigning `req.workspace`.
- `node scripts/createSchool.js --ownerEmail=... --name=... --identifier=... --joinCode=...` provisions a school and its `SCHOOL_ADMIN` membership; no public school creation route is added.

- [ ] **Step 1: Write failing route tests for workspace listing, invalid code, duplicate join, and cross-user workspace access.**

```js
test('non-member cannot resolve a school workspace context', async () => {
  const response = await request(app).get(`/api/workspaces/${schoolId}/context`).set(authFor(otherUser));
  assert.equal(response.status, 403);
  assert.equal(response.body.code, 'WORKSPACE_ACCESS_DENIED');
});
```

- [ ] **Step 2: Run the route tests and confirm they fail before routes and middleware exist.**

- [ ] **Step 3: Implement the safe projections, join route, controlled provisioning script, and membership guard.**

- [ ] **Step 4: Run workspace tests and confirm duplicate joins do not create another Membership.**

- [ ] **Step 5: Commit the workspace API foundation.**

### Task 5: Connect signup/login UI to the API and expose current workspace state

**Files:**
- Modify: `src/context/AuthContext.jsx`
- Modify: `src/services/authService.js`
- Modify: `src/services/api.js`
- Modify: `src/pages/Signup/index.jsx`
- Modify: `src/pages/Login/index.jsx`
- Modify: `src/locales/ar/auth.json`
- Create: `tests/signup-workspace-ui.test.mjs`

**Interfaces:**
- Auth context holds `{ user, token, workspaces, currentWorkspace }` and exposes `signIn(authResponse)` and `signOut()`.
- Signup sends `{ fullName, email, password, stream, grade, schoolCode? }` and updates context only on a successful response.

- [ ] **Step 1: Write a failing source/UI test for the optional school code control and real auth-service submission.**

```js
assert.match(signupSource, /schoolCode/);
assert.match(signupSource, /await signup\(/);
assert.match(signupSource, /signIn\(response\)/);
assert.doesNotMatch(signupSource, /navigate\("\/analysis"\)/);
```

- [ ] **Step 2: Run frontend tests and confirm the new assertion fails.**

- [ ] **Step 3: Implement Arabic optional-school disclosure, API errors, loading state, and safe context update.**

- [ ] **Step 4: Replace only the hard-coded login credential check with the existing login API call.**

- [ ] **Step 5: Run all frontend tests and production build, confirming existing visual routes remain intact.**

- [ ] **Step 6: Commit the client integration.**

### Task 6: Verify the supported deployment paths and document the audit outcomes

**Files:**
- Modify: `backend/.env.example`
- Modify: `README.md` if it exists; otherwise create it
- Modify: `docs/superpowers/specs/2026-09-22-signup-workspace-foundation-design.md`

**Interfaces:**
- Environment documentation lists `MONGO_URI`, `JWT_SECRET`, `PORT`, and optional `JWT_EXPIRES_IN`; no real value is committed.
- Backend test command receives its test database URI from an environment variable and skips only database-dependent tests with an explicit message when it is absent.

- [ ] **Step 1: Add a failing environment-documentation test or static check for the required template keys.**

- [ ] **Step 2: Run it and confirm current documentation lacks the workspace/test requirements.**

- [ ] **Step 3: Document local startup, test database requirements, transaction fallback, and the future-SaaS items that were intentionally not built.**

- [ ] **Step 4: Run frontend tests, backend tests, production build, backend startup/connection check, and a manual registration flow against the configured MongoDB.**

- [ ] **Step 5: Commit documentation and verification results.**

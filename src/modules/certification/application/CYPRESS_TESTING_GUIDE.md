# Cypress Testing Guide for Certification Application (Hotel Registration APIs)

This guide is designed for your module under `src/modules/certification/application` and focuses on API testing for:

- `POST /api/v1/hotels` (Step 1: create hotel + search candidates)
- `POST /api/v1/hotels/:id/confirm-match` (Step 2: confirm selected place)
- Supporting CRUD endpoints (`GET /hotels`, `GET /hotels/:id`, `PUT /hotels/:id`, `DELETE /hotels/:id`)

Swagger reference in this project:

- `http://localhost:5000/api/v1/api-docs`

---

## 1) Why Cypress for Backend API Tests

Even though Cypress is famous for UI testing, it is also excellent for API-level E2E testing because:

- `cy.request()` gives clean HTTP assertions.
- Built-in retries reduce flaky timing issues.
- Easy fixture loading for complex request bodies.
- Rich reporter ecosystem for CI/CD.
- Can be combined with BDD (Gherkin) for readable business scenarios.

For this module, Cypress can validate your **entire registration flow** from login token retrieval to final evaluation status.

---

## 2) Quick Setup (Project Level)

## 2.1 Install packages

```bash
npm install -D cypress
npm install -D @badeball/cypress-cucumber-preprocessor
npm install -D @bahmutov/cypress-esbuild-preprocessor
npm install -D mochawesome mochawesome-merge mochawesome-report-generator
npm install -D cypress-mochawesome-reporter mocha-junit-reporter
```

## 2.2 Add scripts to package.json

```json
{
  "scripts": {
    "cy:open": "cypress open",
    "cy:run": "cypress run",
    "cy:run:api": "cypress run --spec 'cypress/e2e/api/**/*.cy.js'",
    "cy:run:bdd": "cypress run --spec 'cypress/e2e/features/**/*.feature'",
    "test:e2e": "npm run cy:run"
  }
}
```

## 2.3 Recommended folder structure

```text
cypress/
  e2e/
    api/
      hotel-registration.cy.js
      hotel-crud.cy.js
    features/
      hotel_registration.feature
    step_definitions/
      hotel_registration.steps.js
  fixtures/
    auth/
      users.json
    hotels/
      hotel.valid.minimal.json
      hotel.valid.full.json
      hotel.invalid.missing-name.json
  support/
    commands.js
    e2e.js
    api/
      auth.js
      cleanup.js
```

---

## 3) Theory + Practice by Topic

## 3.1 Assertions

### Theory

Assertions are checks that verify expected behavior. In API testing, assertions typically validate:

1. **Protocol correctness** (status code, headers, content type)
2. **Contract correctness** (response shape and required fields)
3. **Business correctness** (domain rules: duplicate detection, role restrictions, evaluation status transitions)

Strong tests usually combine all three.

### Practice for your APIs

For `POST /hotels`:

- Assert `201`
- Assert `success === true`
- Assert `data.hotelId` exists
- Assert `data.candidates` is an array

For `POST /hotels/:id/confirm-match`:

- Assert `200`
- Assert `evaluation.status` in `['passed', 'failed', 'pending']`
- Assert consistency: if status is `pending`, selected place was null or none

For duplicate registration:

- Assert `409`
- Assert error text includes “already registered”

Example:

```js
cy.request({
  method: 'POST',
  url: `${Cypress.env('apiBaseUrl')}/hotels`,
  headers: { Authorization: `Bearer ${token}` },
  body: validHotelPayload,
}).then((res) => {
  expect(res.status).to.eq(201)
  expect(res.body.success).to.eq(true)
  expect(res.body.data.hotelId).to.be.a('string').and.not.empty
  expect(res.body.data.candidates).to.be.an('array')
})
```

---

## 3.2 Fixtures + Setup/Teardown

### Theory

- **Fixtures** are reusable, static test data files.
- **Setup** prepares required state before test execution.
- **Teardown** removes/rolls back state after execution.

Good setup/teardown design prevents flaky tests and keeps tests independent.

Typical anti-pattern:

- One test depends on data created by another test.

Preferred pattern:

- Each test creates its own data or uses isolated fixture-driven setup.

### Practice for your APIs

1. Store payload variants in fixture files under `cypress/fixtures/hotels`.
2. In `before`, login once and save token.
3. In each test, generate unique `registrationNumber` + contact email.
4. Track created IDs in array and delete in `after`.

Example setup/teardown pattern:

```js
let token
const createdHotelIds = []

before(() => {
  cy.loginAsHotelOwner().then((t) => {
    token = t
  })
})

after(() => {
  createdHotelIds.forEach((id) => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.env('apiBaseUrl')}/hotels/${id}`,
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    })
  })
})
```

---

## 3.3 Mocking / Stubbing

### Theory

Mocking and stubbing control external dependencies so tests are deterministic:

- **Stub**: replace a specific dependency behavior.
- **Mock**: broader fake implementation with expected interactions.

Use them to avoid failures caused by external APIs, network instability, quotas, or rate limits.

### Where it matters in your module

`createHotel` and `confirmHotelMatch` can trigger AI/search integrations (`searchHotelCandidates`, `evaluateHotelReviews`, map details). These are perfect candidates for controlled test behavior.

### Practical approaches

#### Approach A: Fast, no backend changes (partial)

- Keep your tests real against backend.
- Only disable strict assertions on candidate content.
- Assert structure, not exact values.

Pros: no code changes.
Cons: still depends on external services.

#### Approach B: Recommended for CI (small backend test hook)

Add a **test mode switch** (e.g., `process.env.E2E_MOCK_MODE === 'true'`) in service layer:

- Return fixed candidates for `searchHotelCandidates`
- Return fixed review score in `evaluateHotelReviews`

Pros: deterministic and reliable CI.
Cons: requires small code branch in service/evaluation layer.

#### Approach C: Service virtualization/proxy

- Route external calls via internal adapter and mock adapter in test env.

Pros: clean architecture.
Cons: more engineering effort.

---

## 3.4 BDD Syntax (Gherkin)

### Theory

BDD makes tests readable by product, QA, and engineering using:

- `Feature`: high-level capability
- `Scenario`: concrete behavior example
- `Given / When / Then`: precondition, action, expected outcome

It aligns automated tests with business language.

### Example feature for your flow

```gherkin
Feature: Hotel registration and AI-assisted confirmation

  As a Hotel Owner
  I want to register a hotel and confirm a map/profile match
  So that the certification process can continue

  Scenario: Successful two-step registration flow
    Given I am authenticated as a "Hotel Owner"
    And I have a valid hotel registration payload
    When I submit the hotel registration request
    Then the API returns 201 and a hotel id with candidates
    When I confirm the first returned candidate
    Then the API returns 200 with an evaluation status
```

### Step definition idea

- `Given I am authenticated as a "Hotel Owner"` → call `/auth/login`
- `When I submit the hotel registration request` → call `POST /hotels`
- `Then ...` → assert status/body

---

## 3.5 Test Reporting

### Theory

Test reporting should answer:

- What passed/failed?
- Where did it fail?
- Is quality improving or regressing?

Good reporting includes machine-readable and human-readable outputs.

### Recommended output mix

1. **Mochawesome HTML** for developers
2. **JUnit XML** for CI systems and dashboards
3. Cypress screenshots/videos on failure for debugging

### Minimal reporting config idea

- Reporter 1: `cypress-mochawesome-reporter` (HTML)
- Reporter 2: JUnit (`mocha-junit-reporter`) or a second run for XML

After run:

- Publish artifacts in CI (`cypress/reports`, `cypress/screenshots`, `cypress/videos`)

---

## 3.6 CI/CD Usage

### Theory

CI/CD usage means tests run automatically on pull requests and main branch updates. This prevents regressions and enforces quality gates.

A robust API E2E pipeline generally:

1. Installs dependencies
2. Starts database and API server
3. Waits for health endpoint
4. Runs Cypress headless
5. Uploads reports/artifacts
6. Fails the build on test failures

### GitHub Actions example

```yaml
name: API E2E Cypress

on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      mongo:
        image: mongo:7
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Start API
        run: npm run dev &

      - name: Wait for API
        run: npx wait-on http://localhost:5000/api/v1

      - name: Run Cypress
        run: npx cypress run
        env:
          NODE_ENV: test
          PORT: 5000
          MONGO_URI: mongodb://localhost:27017/ethical-tourism-e2e
          JWT_SECRET: test-secret
          E2E_MOCK_MODE: "true"

      - name: Upload Cypress Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-artifacts
          path: |
            cypress/screenshots
            cypress/videos
            cypress/reports
```

---

## 4) Suggested Test Matrix for Your Hotel APIs

## 4.1 Happy paths

1. Login as `Hotel Owner` → `POST /hotels` valid payload → `201`
2. Confirm with valid `placeId` → `200` and `evaluation.status` in `passed|failed`
3. Confirm with `null`/missing place choice → `200` and `evaluation.status = pending`

## 4.2 Validation & error paths

4. Invalid JSON in `hotelData` (multipart) → `400`
5. Missing required fields (`businessInfo.name`) → expect validation error behavior
6. Duplicate registration by same email/name+address → `409`
7. Oversized file upload (>15MB) → `400`

## 4.3 Auth/RBAC

8. No token → unauthorized response
9. Role `Tourist` tries `POST /hotels` → forbidden response
10. Role `Admin` can create hotel → success

## 4.4 Query & CRUD behavior

11. `GET /hotels?page=1&limit=...` returns list + expected count shape
12. `GET /hotels/:id` returns created record
13. `PUT /hotels/:id` updates selected fields
14. `DELETE /hotels/:id` removes record

---

## 5) Example Cypress Custom Commands

Put in `cypress/support/commands.js`:

```js
Cypress.Commands.add('loginAsHotelOwner', () => {
  const email = Cypress.env('hotelOwnerEmail')
  const password = Cypress.env('hotelOwnerPassword')

  return cy.request('POST', `${Cypress.env('apiBaseUrl')}/auth/login`, {
    email,
    password,
  }).then((res) => {
    expect(res.status).to.eq(200)
    return res.body.token
  })
})

Cypress.Commands.add('createHotelViaApi', (token, payload) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiBaseUrl')}/hotels`,
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
  })
})
```

---

## 6) Recommended cypress.env.json shape

```json
{
  "apiBaseUrl": "http://localhost:5000/api/v1",
  "hotelOwnerEmail": "script.evaluator@example.com",
  "hotelOwnerPassword": "password123",
  "adminEmail": "admin@test.com",
  "adminPassword": "Test@123"
}
```

Never commit real credentials. In CI, use repository secrets.

---

## 7) Best Practices for Your Project

1. Prefer **API tests first** (`cy.request`) before adding UI tests.
2. Keep each test independent; avoid shared mutable state.
3. Generate unique data in every run (`Date.now()` suffix).
4. Put all external-integration-dependent tests in a separate spec group.
5. Treat `POST /hotels` + `confirm-match` as one core business journey and keep a dedicated end-to-end scenario for it.
6. Keep assertions specific but not brittle (assert schema + key business fields).

---

## 8) Learning Summary (Theory Cheat Sheet)

- **Assertions**: proof that behavior is correct (protocol + contract + business rules).
- **Fixtures/setup/teardown**: data discipline that keeps tests reproducible and isolated.
- **Mocking/stubbing**: replace unstable dependencies for deterministic tests.
- **BDD syntax**: business-readable executable specifications (`Given/When/Then`).
- **Test reporting**: visibility and diagnosis from machine + human outputs.
- **CI/CD usage**: automatic quality gate on every PR/merge.

---

## 9) Next Step Plan (Implementation Order)

1. Add Cypress base setup + scripts.
2. Implement non-BDD API specs first (`hotel-registration.cy.js`).
3. Add fixtures and token helper commands.
4. Add BDD layer (`.feature` + step defs) for key business flow only.
5. Add reporting config.
6. Add GitHub Actions workflow.
7. Stabilize with mock mode for external integrations.

This order gives fast value first, then maturity improvements.

# Certificate Lifecycle Module - Testing Instructions Report

## Overview
This document describes how to test the Certificate Lifecycle module using:

- Unit Testing: Jest
- Integration Testing: Jest + Supertest
- Performance Testing: Artillery

All test assets are scoped only to this module:

- `src/modules/certification/lifecycle/tests/`
- `src/modules/certification/lifecycle/integration-tests/`
- `src/modules/certification/lifecycle/performance-tests/`

---

## Test Integration Plan

### Phase 1 - Unit Testing (Jest)
Goal: Validate individual functions/components in isolation.

1. Cover service helper logic in `lifecycleService`:
   - Trust-score-to-level mapping (`calculateLevel`)
   - Trust score computation and score clamp behavior (`calculateTrustScore`)
   - Eligible hotel summary builder (`buildEligibleHotelsSummary`)
2. Cover DB-related service behavior with mocks:
   - Eligibility lookup from `HotelRequest` + active certificate mapping from `Certificate`
3. Cover controller behavior in isolation:
   - Response payload structure (status, count, data)
   - Actor context forwarding to service
   - Error forwarding through `asyncHandler`

### Phase 2 - Integration Testing (Jest + Supertest)
Goal: Validate collaboration between routes, middleware, controllers, and service contracts.

1. Create test Express app with:
   - Real lifecycle route registration
   - Real JSON parser
   - Real validation middleware
   - Real global error middleware
2. Mock only external dependencies:
   - Auth middleware (inject authenticated user)
   - Lifecycle service functions
3. Validate both success and error scenarios:
   - `POST /certification/certificates` success (201)
   - `POST /certification/certificates` validation error (400)
   - `GET /certification/certificates` success list payload (200)
   - `GET /certification/certificates/:certificateNumber` not found (404)
   - `PUT /certification/certificates/:id/renew` success with default renewal period (200)

### Phase 3 - Performance Testing (Artillery)
Goal: Evaluate API behavior under load and concurrent requests.

1. Use three load phases:
   - Warm-up: 60s @ 2 req/s
   - Ramp-up: 120s @ 5 to 10 req/s
   - Sustained load: 180s @ 10 req/s
2. Test representative lifecycle endpoints:
   - `GET /certification/certificates`
   - `GET /certification/certificates/eligible`
   - `GET /certification/certificates/overview/stats`
   - `GET /certification/certificates/overview/charts`
3. Use Bearer token injection through processor script (`AUTH_TOKEN` from env)

---

## I. Unit Testing

### A. Setup

- Framework: Jest 29.7.0
- Folder: `src/modules/certification/lifecycle/tests/`
- Command:

```bash
npm run test:lifecycle:unit
```

### B. Current Unit Test Files

- `lifecycleService.test.js`
  - Tests helper boundaries and score calculations
  - Tests eligibility mapping behavior with mocked model queries
- `lifecycleController.test.js`
  - Tests controller payload formatting
  - Tests actor context forwarding
  - Tests async error forwarding

### C. Expected Outcome

- All suites pass
- No real DB calls or external service calls in unit tests
- Functions are validated in isolation

---

## II. Integration Testing

### A. Setup

- Framework: Jest + Supertest
- Folder: `src/modules/certification/lifecycle/integration-tests/`
- Command:

```bash
npm run test:lifecycle:integration
```

### B. Scope

Integration tests verify:

- Route wiring
- Request validation behavior
- Controller-to-service interaction
- Error middleware response format

### C. Current Integration Test File

- `lifecycleRoutes.integration.test.js`

Covered cases:

1. Issue certificate success (201)
2. Issue certificate validation failure (400)
3. List certificates success (200)
4. Get certificate by number not found (404)
5. Renew certificate success (200)

---

## III. Performance Testing

### A. Setup

- Tool: Artillery 2.0.26
- Files:
  - `performance-tests/lifecycle-performance.yml`
  - `performance-tests/lifecycle-performance.processor.cjs`

### B. Prerequisites

1. Run backend server:

```bash
npm start
```

2. Set environment variables:

PowerShell:

```powershell
$env:API_BASE_URL="http://localhost:5000"
$env:AUTH_TOKEN="<admin-or-auditor-jwt-token>"
```

Bash:

```bash
export API_BASE_URL="http://localhost:5000"
export AUTH_TOKEN="<admin-or-auditor-jwt-token>"
```

### C. Run Performance Test

```bash
npm run perf:lifecycle
```

### D. Success Criteria

- Stable throughput during ramp and sustained phases
- Low error percentage
- Acceptable p95 and p99 latency for dashboard/read endpoints

---

## Quick Commands Summary

```bash
# lifecycle unit tests
npm run test:lifecycle:unit

# lifecycle integration tests
npm run test:lifecycle:integration

# lifecycle unit + integration
npm run test:lifecycle

# lifecycle performance tests
npm run perf:lifecycle
```

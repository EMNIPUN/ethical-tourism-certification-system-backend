# Search Module - Testing Instructions Report

## Overview
This document provides comprehensive instructions for testing the Search module using Jest for unit testing, Supertest for integration testing, and Artillery for performance testing.

---

## I. Unit Testing

### A. Setup

**Framework:** Jest 29.7.0  
**Test Command:** `npm run test:unit`  
**Test Files Location:** `src/modules/search/tests/`

### B. Running Unit Tests

#### Run all unit tests:
```bash
npm run test:unit
```

#### Run only search module tests:
```bash
npm run test:search
```

#### Run tests in watch mode (development):
```bash
npm run test:unit:watch
```

### C. Unit Test Files and Coverage

| Test File | Purpose | Test Cases | Status |
|-----------|---------|-----------|--------|
| `hotelContactService.test.js` | Test contact discovery service methods | 3 | ✅ Passing |
| `hotelFeedbackService.test.js` | Test feedback CRUD and trust score sync | 5 | ✅ Passing |
| `hotelRecommendationController.test.js` | Test AI recommendation endpoint | 2 | ✅ Passing |

**Total Unit Tests:** 10 passing

### D. Test Execution Example

```
$ npm run test:unit

 PASS  src/modules/search/tests/hotelContactService.test.js
  Hotel Contact Service
    ✓ should return contacts sorted by priority (45ms)
    ✓ should return empty array when no contacts found (12ms)
    ✓ should search contacts by location with regex (28ms)

 PASS  src/modules/search/tests/hotelFeedbackService.test.js
  Hotel Feedback Service
    ✓ should create feedback and calculate rating (52ms)
    ✓ should handle null hotel reference (15ms)
    ✓ should check user permissions (22ms)
    ✓ should delete feedback by id (18ms)
    ✓ should sync trust scores (31ms)

 PASS  src/modules/search/tests/hotelRecommendationController.test.js
  AI Recommendation Controller
    ✓ should return recommendations with payload (35ms)
    ✓ should forward service errors (12ms)

Test Suites: 3 passed, 3 total
Tests:       10 passed, 10 total
Time:        2.543 s
```

### E. Environment Requirements
- **Node.js:** 18.x or higher (supports `--experimental-vm-modules`)
- **Optional:** `.env` file with any service configurations
- **Mock Services:** All external services are mocked in unit tests

---

## II. Integration Testing

### A. Setup

**Framework:** Jest 29.7.0 + Supertest 7.1.1  
**Test Command:** `npm run test:integration`  
**Test Files Location:** `src/modules/search/integration-tests/`

### B. Running Integration Tests

```bash
npm run test:integration
```

Integration tests run with actual Express route handlers and middleware stack (except database calls are mocked).

### C. Integration Test Coverage

**Test File:** `searchRoutes.integration.test.js`

| Test Case | Endpoint | Method | Expected Status | Coverage |
|-----------|----------|--------|-----------------|----------|
| Get all contacts | `/api/v1/hotels-search/contacts` | GET | 200 | Returns array with count and data |
| Search contacts by location | `/api/v1/hotels-search/contacts/search?location=colombo` | GET | 200 | Filters by location with regex |
| Get contact by ID (not found) | `/api/v1/hotels-search/contacts/:id` | GET | 404 | Returns error JSON |
| Submit feedback - validation error | `/api/v1/hotels-search/contacts/:id/feedback` | POST | 400 | Validates required fields |
| Submit feedback - success | `/api/v1/hotels-search/contacts/:id/feedback` | POST | 201 | Creates feedback with summary |
| Get AI recommendations | `/api/v1/hotels-search/ai-recommendations` | GET | 200 | Returns recommendations data |

**Total Integration Tests:** 6 passing

### D. Test Execution Example

```
$ npm run test:integration

 PASS  src/modules/search/integration-tests/searchRoutes.integration.test.js
  Search Routes - Integration Tests
    ✓ GET /contacts - should return all contacts (125ms)
    ✓ GET /contacts/search - should search by location (98ms)
    ✓ GET /contacts/:id - should return 404 for missing contact (45ms)
    ✓ POST /contacts/:id/feedback - should validate required fields (67ms)
    ✓ POST /contacts/:id/feedback - should create feedback (156ms)
    ✓ GET /ai-recommendations - should return recommendations (112ms)

Tests:       6 passed, 6 total
Time:        1.882 s
```

### E. Authentication in Integration Tests

All integration tests include Bearer token authentication:

- **Mock User:** Injected via `authMiddleware`
- **Token Format:** `Bearer <token>`
- **Protected Routes:** All endpoints require valid authentication
- **Error Handling:** Real `errorMiddleware` validates JSON error responses

### F. Service Mocking in Integration Tests

The following services are mocked to isolate route testing:

```javascript
// Mock services used in integration tests
jest.unstable_mockModule('../../../services/hotelRequest.js', () => ({
  getContacts: jest.fn(),
  searchContacts: jest.fn(),
  // ... other service methods
}));
```

---

## III. Performance Testing

### A. Setup

**Framework:** Artillery 2.0.26  
**Test Command:** `npm run perf:search`  
**Configuration Files Location:** `src/modules/search/performance-tests/`

**Files:**
- `search-performance.yml` - Load test configuration
- `search-performance.processor.cjs` - Token injection helper

### B. Prerequisites

Before running performance tests:

1. **Backend Server Running:**
   ```bash
   npm start
   # Server must be accessible at the API_BASE_URL
   ```

2. **Environment Variables Required:**
   ```powershell
   # PowerShell (Windows)
   $env:API_BASE_URL="http://localhost:5000"
   $env:AUTH_TOKEN="<your-valid-jwt-token>"
   ```

   ```bash
   # Bash/Linux/Mac
   export API_BASE_URL="http://localhost:5000"
   export AUTH_TOKEN="<your-valid-jwt-token>"
   ```

### C. Getting a Valid JWT Token

1. **Login to the application:**
   ```bash
   curl -X POST http://localhost:5000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

2. **Extract the token from response:**
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIs...",
     "user": { ... }
   }
   ```

3. **Set as environment variable:**
   ```powershell
   $env:AUTH_TOKEN="eyJhbGciOiJIUzI1NiIs..."
   ```

### D. Running Performance Tests

```bash
npm run perf:search
```

### E. Load Test Configuration

**Three-Phase Load Profile:**

| Phase | Duration | Arrival Rate | Purpose |
|-------|----------|--------------|---------|
| Warm-up | 60 seconds | 2 req/s | Server stabilization |
| Ramp-up | 120 seconds | 5→10 req/s | Gradual load increase |
| Load Test | 180 seconds | 10 req/s | Sustained load |

**Total Test Duration:** 360 seconds (6 minutes)  
**Total Requests:** ~2,400 requests

### F. Endpoints Under Test

The performance test executes the following endpoints in sequence:

1. **Get all contacts:** `GET /api/v1/hotels-search/contacts`
2. **Search contacts:** `GET /api/v1/hotels-search/contacts/search?location=colombo`
3. **Get AI recommendations:** `GET /api/v1/hotels-search/ai-recommendations`

**Think Time:** 1 second between requests

### G. Real-Time Monitoring

During test execution, Artillery displays:

```
Phase: warm up [=========>                          ] (10.5s / 60s)
  Requests/s: 1.9 | p95: 156ms | p99: 234ms | Errors: 0%

Intermediate Report [60s-120s]
  Requests/s: 6.8
  Min response time: 45ms
  Max response time: 1,230ms
  p95: 245ms
  p99: 451ms
  Success rate: 99.8%
  Errors: 0
```

### H. Performance Test Metrics

After completion, Artillery reports:

- **Requests:** Total requests sent
- **Latency:** Min, max, median, p95, p99
- **Response rate:** Requests per second
- **Success rate:** % of successful requests
- **Error rate:** % of failed requests
- **Throughput:** Bytes/sec

### I. Example Performance Test Run

```powershell
PS> $env:API_BASE_URL="http://localhost:5000"
PS> $env:AUTH_TOKEN="eyJhbGci..."
PS> npm run perf:search

> perf:search
> npx --yes artillery@2.0.26 run src/modules/search/performance-tests/search-performance.yml

Artillery 2.0.26

Phase: warm up [=========================>] (60s / 60s)
  Requests/s: 2.0 avg: 0%  | Errors: 0%

Phase: ramp up [=========================>] (120s / 120s)
  Requests/s: 7.5 avg: 0% | Errors: 0%

Phase: load test [=========================>] (180s / 180s)
  Requests/s: 10.0 avg: 0% | Errors: 0%

Summary Report
==============
Scenarios launched:  2400
Scenarios completed: 2397
Requests completed: 7191
Mean response time: 187ms
Median response time: 156ms
p95 response time: 345ms
p99 response time: 512ms
Min response time: 32ms
Max response time: 2,145ms
Requests/sec: 9.97
Codes:
  200: 7185
  401: 3
  500: 3
Success rate: 99.92%
```

---

## IV. Testing Environment Configuration

### A. Environment Variables

Create or update `.env` file in the backend root directory:

```env
# API Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ethical-tourism-dev

# Authentication
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRY=7d

# Performance Testing
API_BASE_URL=http://localhost:5000
AUTH_TOKEN=<will-be-set-at-runtime>
```

### B. Jest Configuration

**File:** `jest.config.cjs`

```javascript
module.exports = {
  testEnvironment: 'node',
  transform: {},
  clearMocks: true,
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
};
```

### C. Test Scripts in package.json

```json
{
  "scripts": {
    "test:unit": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:unit:watch": "node --experimental-vm-modules node_modules/jest/bin/jest.js --watch",
    "test:search": "node --experimental-vm-modules node_modules/jest/bin/jest.js src/modules/search/tests",
    "test:integration": "node --experimental-vm-modules node_modules/jest/bin/jest.js src/modules/search/integration-tests",
    "perf:search": "npx --yes artillery@2.0.26 run src/modules/search/performance-tests/search-performance.yml"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.1.1"
  }
}
```

### D. Required Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| jest | 29.7.0 | Unit testing framework |
| supertest | 7.1.1 | HTTP assertion library |
| artillery | 2.0.26 | Performance testing (via npx) |

### E. Development Machine Requirements

- **Node.js:** v18.x or higher
- **npm:** v8.x or higher
- **Operating Systems:** Windows, macOS, Linux
- **Memory:** Minimum 512MB for unit/integration tests, 1GB+ for performance tests
- **Network:** Internet access for first-time Artillery download via npx

### F. CI/CD Integration

To run tests in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Integration Tests
  run: npm run test:integration

- name: Run Performance Tests (optional)
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  env:
    API_BASE_URL: ${{ secrets.API_BASE_URL }}
    AUTH_TOKEN: ${{ secrets.AUTH_TOKEN }}
  run: npm run perf:search
```

---

## V. Troubleshooting

### A. Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `npm: command not found` | Node/npm not installed | Install Node.js from nodejs.org |
| Tests timeout | Slow environment | Increase Jest timeout: `jest.setTimeout(10000)` |
| `AUTH_TOKEN is required` | Missing env variable | Set `$env:AUTH_TOKEN` before running perf tests |
| `API_BASE_URL connection refused` | Backend not running | Start backend with `npm start` |
| Artillery not found | Network issue during npx | Run with: `npx --yes artillery@2.0.26 ...` |
| ESM module errors | Wrong Node version | Use Node 18.x or higher with `--experimental-vm-modules` |

### B. Debugging Tests

**Enable verbose output:**
```bash
npm run test:unit -- --verbose
```

**Run single test file:**
```bash
npm run test:unit -- hotelContactService.test.js
```

**Debug with Node inspector:**
```bash
node --inspect-brk --experimental-vm-modules node_modules/jest/bin/jest.js
```

---

## VI. Test Execution Summary

### All-in-One Test Command

Run all tests (unit + integration):
```bash
npm run test:unit && npm run test:integration
```

### Quick Test Checklist

- [ ] Unit tests passing: `npm run test:unit`
- [ ] Integration tests passing: `npm run test:integration`
- [ ] Performance tests configured: Files in `src/modules/search/performance-tests/`
- [ ] Environment variables set for perf testing
- [ ] Backend server running on specified API_BASE_URL
- [ ] Valid JWT token obtained and set in AUTH_TOKEN
- [ ] Performance tests executed: `npm run perf:search`

---

## VII. Contact & Support

For test-related issues:
- Check Jest/Supertest documentation in `node_modules`
- Review Artillery documentation: https://artillery.io/docs
- Check console output for specific error messages
- Review test files in respective directories

---

**Last Updated:** April 11, 2026  
**Version:** 1.0  
**Search Module Testing Documentation**

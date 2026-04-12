# Hotel Registration Module Test Cases

This document explains the test suites that ensure the structural integrity of the Hotel Application/Registration operations.

## 1. Unit Tests (`unit/hotelController.test.js`)
**Framework**: Jest
**Strategy**: Isolated mock modules testing JSON handling and Express error wrappers.

### Controller: `createHotel`
- **Test Case 1**: `should successfully parse hotel data and register a hotel`
  - **Description**: Validates that passing a stringified `hotelData` payload (which mirrors realistic `FormData` HTTP submissions containing files) behaves correctly. Verifies the JSON parsing success, checks the callback payload issued to `hotelService.createHotel()`, and ensures that an HTTP `201 Created` mapped structure is yielded.

- **Test Case 2**: `should throw an error if hotelData JSON is invalid`
  - **Description**: Ensures that malformed frontend submissions strictly do not crash the Express server. Asserts that the controller's internal `try-catch` intercepts the malformed JSON failure securely and deliberately executes `next(error)` which subsequently triggers a `400 Bad Request` resolution.

## 2. Integration Tests (`integration/hotel.test.js`)
**Framework**: Jest + Supertest
**Strategy**: E2E simulation bypassing mocked layers to hit Express Routing directly.

### Endpoint: `POST /hotels`
- **Test Case 1**: `should return 401 Unauthorized for invalid token attempt`
  - **Description**: Validates that the Authentication middleware protects write-restricted routes by immediately yielding a 401 error.

- **Test Case 2**: `should attempt to register a new hotel with valid JSON payload`
  - **Description**: Evaluates the network path validation logic by sending a well-formed JSON body string, ensuring we successfully bypass any `400` malformed error branches.

### Endpoint: `GET /hotels`
- **Test Case**: `should fetch a paginated list of hotels successfully`
  - **Description**: Tests retrieval logic for multi-query URLs (e.g. `?page=1&limit=5`), verifying that successful `200 OK` network responses encapsulate accurate `success: true` and paginated arrays gracefully.

## 3. Performance Tests (`performance/hotelRegistration.yml`)
**Framework**: Artillery

### Load Specifications
- **Duration**: 60 seconds continuously.
- **Arrival Rate**: Gradual stress ramping up to 20 artificial users per second.

### Traffic Scenarios
- **Task 1 (Weight: 3)**: `Browsing Hotel Directory`
  - Continuously fires against `GET /hotels?page=1&limit=10` representing the majority (75%) flow of organic internet traffic consuming paginated results.
- **Task 2 (Weight: 1)**: `Creating Initial Hotel Registration`
  - Dispatches mock `POST` form data periodically to guarantee the backend CPU allocations can concurrently juggle data-writes seamlessly without choking the search results.

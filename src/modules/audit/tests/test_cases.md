# Audit Module Test Cases

This document outlines the testing strategy and specific test suites implemented to validate the Audit certification functionalities.

## 1. Unit Tests (`unit/auditController.test.js`)
**Framework**: Jest
**Strategy**: Isolated testing using mocked service layers.

### Controller: `createAudit`
- **Test Case**: `should successfully create an audit and return 201`
  - **Description**: Validates that when a valid payload (hotelId & status) is provided along with an authenticated user object, the controller correctly delegates the task to `auditService.createAudit()`. It ensures the HTTP response status is `201 Created` and returns the expected success JSON payload containing the newly minted audit object.

## 2. Integration Tests (`integration/audit.test.js`)
**Framework**: Jest + Supertest
**Strategy**: API surface area testing and middleware validation.

### Endpoints Overview
- **Test Case**: Protect Routes via Authentication Middleware
  - **Description**: Validates that endpoints such as `/audits` properly implement the `authMiddleware` layer. Tests ensure that random/unauthorized network requests accurately intercept the pipeline and return the expected `401 Unauthorized` HTTP error before any sensitive controller logic compromises data.

## 3. Performance Tests (`performance/audit.yml`)
**Framework**: Artillery
**Strategy**: Simulate organic stress patterns.

### Load Specifications
- **Duration**: 60 seconds
- **Arrival Rate**: Ramp from 5 users up to 20 users per second dynamically.

### Scenario: `Audit Read/Write Workflows`
- **Flow**: Injects artificial load spikes targeting the core audit REST infrastructure to highlight system health, latency thresholds, and potential bottlenecks within MongoDB concurrent read protocols.

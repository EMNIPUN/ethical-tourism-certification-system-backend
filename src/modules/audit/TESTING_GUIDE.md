# Audit & Review Module - Testing Guide

## Table of Contents

1. [Overview](#overview)
2. [Testing Setup](#testing-setup)
3. [Test Data Preparation](#test-data-preparation)
4. [API Testing Guide](#api-testing-guide)
5. [Manual Testing Workflows](#manual-testing-workflows)
6. [Automated Testing](#automated-testing)
7. [Common Test Scenarios](#common-test-scenarios)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Audit & Review module allows auditors to systematically review hotel certification requests section by section. This guide covers how to test all functionality comprehensively.

### Module Components

- **Model**: `Audit.js` - Data structure for audits
- **Controller**: `auditController.js` - Request handlers
- **Service**: `auditService.js` - Business logic
- **Routes**: `auditRoutes.js` - API endpoints
- **Validations**: `auditValidation.js` - Input validation

---

## Testing Setup

### Prerequisites

1. **Node.js** (v14+ recommended)
2. **MongoDB** (running locally or remote instance)
3. **Postman** or **Thunder Client** (for API testing)
4. **Valid JWT tokens** for authentication

### Environment Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure environment variables** (`.env` file):

   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/ethical-tourism
   JWT_SECRET=your_secret_key_here
   JWT_EXPIRE=30d
   ```

3. **Start the server**:

   ```bash
   npm start
   ```

4. **Verify server is running**:
   - Navigate to: `http://localhost:5000/api/v1`
   - Should return: "API v1 is running"

5. **Access Swagger Documentation**:
   - URL: `http://localhost:5000/api/v1/api-docs`
   - All audit endpoints are documented under "Audit & Review" tag

---

## Test Data Preparation

### 1. Create Test Users

**Admin User**:

```http
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@test.com",
  "password": "Test@123",
  "role": "Admin"
}
```

**Auditor User**:

```http
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "name": "John Auditor",
  "email": "auditor@test.com",
  "password": "Test@123",
  "role": "Auditor"
}
```

**Login to get JWT token**:

```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "Test@123"
}
```

**Response**:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

⚠️ **Important**: Save the token for subsequent requests!

### 2. Create Test Hotel

```http
POST http://localhost:5000/api/v1/hotels
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "businessInfo": {
    "name": "Test Hotel Paradise",
    "registrationNumber": "TH-2025-001",
    "licenseNumber": "LIC-001",
    "businessType": "Hotel",
    "contact": {
      "ownerName": "Test Owner",
      "phone": "+94 111 222 333",
      "email": "hotel@test.com",
      "address": "123 Test Street, Colombo"
    }
  },
  "guestServices": {
    "facilities": {
      "numberOfRooms": 50
    }
  }
}
```

**Save the returned hotel `_id` for audit creation!**

---

## API Testing Guide

### Authentication

All audit endpoints require authentication. Include the JWT token in headers:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### 1. Create Audit

**Endpoint**: `POST /api/v1/audits`  
**Access**: Admin only

**Request**:

```http
POST http://localhost:5000/api/v1/audits
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "hotel": "698a02d268417518fd9b33ef",
  "auditor": "YOUR_AUDITOR_USER_ID"
}
```

**Expected Response** (201):

```json
{
  "success": true,
  "message": "Audit created successfully",
  "data": {
    "_id": "698b12345678901234567890",
    "hotel": { ... },
    "auditor": { ... },
    "auditStatus": "initiated",
    "sections": {
      "businessInfo": { "status": "pending" },
      "legalDocuments": { "status": "pending" },
      // ...
    },
    "overallScore": 0
  }
}
```

**Test Cases**:

- ✅ Valid hotel and auditor IDs
- ❌ Invalid hotel ID (should return error)
- ❌ Invalid auditor ID (should return error)
- ❌ Auditor with non-Auditor role (should return error)
- ❌ Duplicate active audit for same hotel (should return error)

---

### 2. Get All Audits

**Endpoint**: `GET /api/v1/audits`  
**Access**: Admin, Auditor

**Request**:

```http
GET http://localhost:5000/api/v1/audits?page=1&limit=10&auditStatus=in_progress
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters**:

- `page` (integer, default: 1)
- `limit` (integer, default: 10, max: 100)
- `hotel` (string, MongoDB ObjectId)
- `auditor` (string, MongoDB ObjectId)
- `auditStatus` (enum: initiated, in_progress, completed, suspended)
- `recommendation` (enum: approve, reject, conditional_approval, pending)
- `sortBy` (enum: createdAt, updatedAt, overallScore, auditCompletionDate)
- `order` (enum: asc, desc)

**Expected Response** (200):

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

**Test Cases**:

- ✅ No filters (get all audits)
- ✅ Filter by hotel ID
- ✅ Filter by auditor ID
- ✅ Filter by status
- ✅ Pagination with different page numbers
- ✅ Sorting by different fields
- ✅ Auditor role (should only see their own audits)

---

### 3. Get Audit by ID

**Endpoint**: `GET /api/v1/audits/:id`  
**Access**: Admin, Auditor (assigned)

**Request**:

```http
GET http://localhost:5000/api/v1/audits/698b12345678901234567890
Authorization: Bearer YOUR_TOKEN
```

**Expected Response** (200):

```json
{
  "success": true,
  "data": {
    "_id": "698b12345678901234567890",
    "hotel": { ... },
    "auditor": { ... },
    "sections": { ... },
    "auditLog": [ ... ]
  }
}
```

**Test Cases**:

- ✅ Valid audit ID
- ❌ Invalid audit ID format
- ❌ Non-existent audit ID
- ❌ Auditor accessing another auditor's audit (403 Forbidden)

---

### 4. Review a Section

**Endpoint**: `PUT /api/v1/audits/:id/sections/review`  
**Access**: Admin, Auditor (assigned)

**Request**:

```http
PUT http://localhost:5000/api/v1/audits/698b12345678901234567890/sections/review
Content-Type: application/json
Authorization: Bearer YOUR_AUDITOR_TOKEN

{
  "sectionName": "businessInfo",
  "status": "approved",
  "comment": "All business information is complete and verified.",
  "score": 95,
  "notes": [
    {
      "field": "registrationNumber",
      "issue": "Registration number format verified",
      "severity": "minor"
    }
  ]
}
```

**Section Names**:

- `businessInfo`
- `legalDocuments`
- `employeePractices`
- `sustainability`
- `community`
- `guestServices`

**Status Options**:

- `pending`
- `approved`
- `rejected`
- `needs_revision`

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Section 'businessInfo' reviewed successfully",
  "data": {
    "sections": {
      "businessInfo": {
        "status": "approved",
        "comment": "All business information is complete and verified.",
        "reviewedBy": "...",
        "reviewedAt": "2026-02-25T10:30:00.000Z"
      }
    }
  }
}
```

**Test Cases**:

- ✅ Review each section with different statuses
- ✅ Add comments and notes
- ✅ Update scores
- ❌ Invalid section name
- ❌ Invalid status value
- ❌ Comment exceeding 2000 characters
- ❌ Score outside 0-100 range
- ❌ Review completed audit (should fail)

---

### 5. Update Section Score

**Endpoint**: `PUT /api/v1/audits/:id/sections/score`  
**Access**: Admin, Auditor (assigned)

**Request**:

```http
PUT http://localhost:5000/api/v1/audits/698b12345678901234567890/sections/score
Content-Type: application/json
Authorization: Bearer YOUR_AUDITOR_TOKEN

{
  "sectionName": "sustainability",
  "score": 88
}
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Score for 'sustainability' updated successfully",
  "data": {
    "sectionScores": {
      "sustainability": 88
    },
    "overallScore": 85
  }
}
```

**Test Cases**:

- ✅ Update scores for all sections
- ❌ Score < 0
- ❌ Score > 100
- ❌ Invalid section name

---

### 6. Add Compliance Check

**Endpoint**: `POST /api/v1/audits/:id/compliance-checks`  
**Access**: Admin, Auditor (assigned)

**Request**:

```http
POST http://localhost:5000/api/v1/audits/698b12345678901234567890/compliance-checks
Content-Type: application/json
Authorization: Bearer YOUR_AUDITOR_TOKEN

{
  "category": "Employee Practices",
  "item": "Minimum wage compliance verified",
  "compliant": true,
  "evidence": "Reviewed salary slips for last 3 months",
  "comment": "All employees are paid above minimum wage"
}
```

**Expected Response** (201):

```json
{
  "success": true,
  "message": "Compliance check added successfully",
  "data": {
    "complianceChecks": [ ... ]
  }
}
```

**Test Cases**:

- ✅ Add multiple compliance checks
- ✅ Mark items as compliant/non-compliant
- ❌ Missing required fields

---

### 7. Schedule Site Visit

**Endpoint**: `POST /api/v1/audits/:id/site-visit/schedule`  
**Access**: Admin, Auditor (assigned)

**Request**:

```http
POST http://localhost:5000/api/v1/audits/698b12345678901234567890/site-visit/schedule
Content-Type: application/json
Authorization: Bearer YOUR_AUDITOR_TOKEN

{
  "visitDate": "2026-03-15T09:00:00.000Z",
  "duration": "2 days",
  "attendees": ["John Auditor", "Jane Inspector"],
  "findings": ""
}
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Site visit scheduled successfully",
  "data": {
    "siteVisit": {
      "scheduled": true,
      "visitDate": "2026-03-15T09:00:00.000Z",
      "duration": "2 days",
      "attendees": ["John Auditor", "Jane Inspector"]
    }
  }
}
```

**Test Cases**:

- ✅ Schedule site visit
- ❌ Visit date in the past (should fail)
- ✅ Update visit details

---

### 8. Update Site Visit Findings

**Endpoint**: `PUT /api/v1/audits/:id/site-visit/findings`  
**Access**: Admin, Auditor (assigned)

**Request**:

```http
PUT http://localhost:5000/api/v1/audits/698b12345678901234567890/site-visit/findings
Content-Type: application/json
Authorization: Bearer YOUR_AUDITOR_TOKEN

{
  "findings": "Site visit completed successfully. All facilities were inspected and found to be in good condition. Staff demonstrated strong knowledge of safety protocols.",
  "attendees": ["John Auditor", "Jane Inspector", "Hotel Manager"]
}
```

**Test Cases**:

- ✅ Add findings after site visit
- ❌ Update findings without scheduled visit (should fail)

---

### 9. Add Attachment

**Endpoint**: `POST /api/v1/audits/:id/attachments`  
**Access**: Admin, Auditor (assigned)

**Request**:

```http
POST http://localhost:5000/api/v1/audits/698b12345678901234567890/attachments
Content-Type: application/json
Authorization: Bearer YOUR_AUDITOR_TOKEN

{
  "fileName": "site_visit_photos.pdf",
  "fileType": "application/pdf",
  "fileUrl": "https://example.com/uploads/audit_photos.pdf",
  "description": "Photos taken during site visit on March 15, 2026"
}
```

**Expected Response** (201):

```json
{
  "success": true,
  "message": "Attachment added successfully",
  "data": {
    "attachments": [ ... ]
  }
}
```

**Test Cases**:

- ✅ Add multiple attachments
- ✅ Different file types (PDF, images, documents)
- ❌ Invalid URL format

---

### 10. Complete Audit

**Endpoint**: `PUT /api/v1/audits/:id/complete`  
**Access**: Admin, Auditor (assigned)

**Request**:

```http
PUT http://localhost:5000/api/v1/audits/698b12345678901234567890/complete
Content-Type: application/json
Authorization: Bearer YOUR_AUDITOR_TOKEN

{
  "recommendation": "approve",
  "finalComments": "The hotel meets all certification criteria. Excellent sustainability practices and employee welfare programs. Recommended for Gold certification.",
  "overallScore": 85
}
```

**Recommendation Options**:

- `approve`
- `reject`
- `conditional_approval`

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Audit completed successfully",
  "data": {
    "auditStatus": "completed",
    "recommendation": "approve",
    "overallScore": 85,
    "auditCompletionDate": "2026-02-25T12:00:00.000Z"
  }
}
```

**Test Cases**:

- ✅ Complete audit with all sections reviewed
- ❌ Complete audit with pending sections (should fail)
- ✅ Different recommendation types
- ✅ Verify hotel scoring is updated
- ❌ Complete already completed audit (should fail)

---

### 11. Suspend Audit

**Endpoint**: `PUT /api/v1/audits/:id/suspend`  
**Access**: Admin only

**Request**:

```http
PUT http://localhost:5000/api/v1/audits/698b12345678901234567890/suspend
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "reason": "Pending additional documentation from hotel"
}
```

**Test Cases**:

- ✅ Suspend active audit
- ❌ Suspend completed audit (should fail)

---

### 12. Resume Audit

**Endpoint**: `PUT /api/v1/audits/:id/resume`  
**Access**: Admin only

**Request**:

```http
PUT http://localhost:5000/api/v1/audits/698b12345678901234567890/resume
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Test Cases**:

- ✅ Resume suspended audit
- ❌ Resume non-suspended audit (should fail)

---

### 13. Get Audits by Hotel

**Endpoint**: `GET /api/v1/audits/hotel/:hotelId`  
**Access**: Admin, Auditor

**Request**:

```http
GET http://localhost:5000/api/v1/audits/hotel/698a02d268417518fd9b33ef
Authorization: Bearer YOUR_TOKEN
```

---

### 14. Get Audits by Auditor

**Endpoint**: `GET /api/v1/audits/auditor/:auditorId`  
**Access**: Admin, Auditor (own audits)

**Request**:

```http
GET http://localhost:5000/api/v1/audits/auditor/YOUR_AUDITOR_ID
Authorization: Bearer YOUR_TOKEN
```

---

### 15. Get Audit Statistics

**Endpoint**: `GET /api/v1/audits/stats/overview`  
**Access**: Admin only

**Request**:

```http
GET http://localhost:5000/api/v1/audits/stats/overview
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response** (200):

```json
{
  "success": true,
  "data": {
    "totalAudits": 50,
    "completedAudits": 35,
    "inProgressAudits": 10,
    "initiatedAudits": 3,
    "suspendedAudits": 2,
    "averageScore": 78.5,
    "approvedCount": 30,
    "rejectedCount": 3,
    "conditionalApprovalCount": 2
  }
}
```

---

### 16. Delete Audit

**Endpoint**: `DELETE /api/v1/audits/:id`  
**Access**: Admin only

**Request**:

```http
DELETE http://localhost:5000/api/v1/audits/698b12345678901234567890
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Test Cases**:

- ✅ Delete non-completed audit
- ❌ Delete completed audit (should fail)

---

## Manual Testing Workflows

### Workflow 1: Complete Audit Process

1. **Create audit** (Admin)
2. **Get audit details** (Auditor)
3. **Review businessInfo section** → Mark as "approved"
4. **Review legalDocuments section** → Mark as "needs_revision"
5. **Review employeePractices section** → Mark as "approved", score: 90
6. **Schedule site visit**
7. **Add compliance checks** (multiple)
8. **Review sustainability section** → Mark as "approved", score: 85
9. **Review community section** → Mark as "approved", score: 80
10. **Review guestServices section** → Mark as "approved", score: 88
11. **Update site visit findings**
12. **Add attachments** (photos, reports)
13. **Complete audit** with recommendation "approve"
14. **Verify hotel's auditor score updated**

### Workflow 2: Audit with Revisions

1. Create audit
2. Review sections and mark some as "needs_revision"
3. Add detailed notes on what needs improvement
4. Suspend audit
5. (Hotel makes changes)
6. Resume audit
7. Re-review sections
8. Complete audit

### Workflow 3: Rejected Audit

1. Create audit
2. Review sections and find major issues
3. Mark critical sections as "rejected"
4. Add compliance checks showing non-compliance
5. Complete audit with recommendation "reject"

---

## Automated Testing

### Setting Up Testing Framework

1. **Install testing dependencies**:

   ```bash
   npm install --save-dev jest supertest mongodb-memory-server
   ```

2. **Create test configuration** (`jest.config.js`):
   ```javascript
   export default {
     testEnvironment: "node",
     coveragePathIgnorePatterns: ["/node_modules/"],
     testMatch: ["**/__tests__/**/*.test.js"],
     setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
   };
   ```

### Sample Test File

Create `src/modules/audit/__tests__/auditService.test.js`:

```javascript
import auditService from "../services/auditService.js";
import Audit from "../models/Audit.js";
import Hotel from "../../certification/application/models/Hotel.js";
import User from "../../../common/models/User.js";

describe("Audit Service", () => {
  describe("createAudit", () => {
    it("should create a new audit", async () => {
      // Arrange
      const hotelData = {
        /* ... */
      };
      const auditorData = {
        /* ... */
      };
      const hotel = await Hotel.create(hotelData);
      const auditor = await User.create(auditorData);

      // Act
      const audit = await auditService.createAudit(
        {
          hotel: hotel._id,
          auditor: auditor._id,
        },
        adminId,
      );

      // Assert
      expect(audit).toBeDefined();
      expect(audit.hotel._id.toString()).toBe(hotel._id.toString());
      expect(audit.auditStatus).toBe("initiated");
    });

    it("should throw error if hotel not found", async () => {
      // Arrange
      const invalidHotelId = "507f1f77bcf86cd799439011";

      // Act & Assert
      await expect(
        auditService.createAudit(
          {
            hotel: invalidHotelId,
            auditor: validAuditorId,
          },
          adminId,
        ),
      ).rejects.toThrow("Hotel not found");
    });
  });

  describe("reviewSection", () => {
    it("should review a section successfully", async () => {
      // Arrange
      const audit = await createTestAudit();

      // Act
      const updated = await auditService.reviewSection(
        audit._id,
        "businessInfo",
        {
          status: "approved",
          comment: "Looks good",
          score: 90,
        },
        auditorId,
      );

      // Assert
      expect(updated.sections.businessInfo.status).toBe("approved");
      expect(updated.sections.businessInfo.comment).toBe("Looks good");
      expect(updated.sectionScores.businessInfo).toBe(90);
    });
  });
});
```

**Run tests**:

```bash
npm test
```

---

## Common Test Scenarios

### Error Handling Tests

1. **Unauthorized Access**:
   - Try accessing endpoints without token → 401
   - Try accessing with invalid token → 401
   - Auditor accessing another auditor's audit → 403

2. **Validation Errors**:
   - Invalid ObjectId format → 400
   - Missing required fields → 400
   - Values outside allowed range → 400
   - String length exceeds maximum → 400

3. **Business Logic Errors**:
   - Creating duplicate active audit → 400
   - Completing audit with pending sections → 400
   - Reviewing completed audit → 400

### Performance Tests

1. **Pagination**:
   - Create 100+ audits
   - Test different page sizes (10, 50, 100)
   - Measure response time

2. **Filtering**:
   - Test with various filter combinations
   - Verify correct results returned

---

## Troubleshooting

### Common Issues

#### 1. "Audit not found"

- **Cause**: Invalid audit ID or audit doesn't exist
- **Solution**: Verify audit ID is correct MongoDB ObjectId

#### 2. "Not authorized to access this route"

- **Cause**: Missing or invalid JWT token
- **Solution**: Login again and use fresh token

#### 3. "All sections must be reviewed before completing"

- **Cause**: Some sections still have "pending" status
- **Solution**: Review all 6 sections before completing

#### 4. "Cannot review a completed audit"

- **Cause**: Trying to modify a completed audit
- **Solution**: Only in-progress audits can be modified

#### 5. Validation errors on section name

- **Cause**: Typo in section name
- **Valid names**: businessInfo, legalDocuments, employeePractices, sustainability, community, guestServices

---

## Postman Collection

### Import Ready Collection

Create a file `Audit_API_Collection.postman_collection.json`:

```json
{
  "info": {
    "name": "Audit & Review API",
    "description": "Complete audit API test collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:5000/api/v1"
    },
    {
      "key": "jwt_token",
      "value": ""
    },
    {
      "key": "audit_id",
      "value": ""
    },
    {
      "key": "hotel_id",
      "value": ""
    }
  ]
}
```

**Import into Postman**:

1. Open Postman
2. Click Import
3. Select the JSON file
4. Set environment variables (jwt_token, etc.)

---

## Testing Checklist

### Before Testing

- [ ] Server is running
- [ ] Database connection is established
- [ ] JWT tokens are generated for Admin and Auditor
- [ ] Test hotel is created
- [ ] Test users (Admin, Auditor) are created

### Core Functionality

- [ ] Create audit
- [ ] Get all audits with pagination
- [ ] Get audit by ID
- [ ] Review each of 6 sections
- [ ] Update section scores
- [ ] Add compliance checks
- [ ] Schedule site visit
- [ ] Update site visit findings
- [ ] Add attachments
- [ ] Complete audit
- [ ] Verify hotel score updated

### Edge Cases

- [ ] Create duplicate audit (should fail)
- [ ] Review with invalid section name (should fail)
- [ ] Complete audit with pending sections (should fail)
- [ ] Access audit as wrong auditor (should fail)
- [ ] Delete completed audit (should fail)

### Admin Functions

- [ ] Suspend audit
- [ ] Resume audit
- [ ] Delete audit
- [ ] Get audit statistics

---

## Performance Benchmarks

**Expected Response Times** (development environment):

- GET requests: < 200ms
- POST/PUT requests: < 500ms
- Statistics calculation: < 1000ms

Monitor response times and investigate if they exceed these thresholds.

---

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm install
      - run: npm test
```

---

## Additional Resources

- **Swagger Documentation**: `http://localhost:5000/api/v1/api-docs`
- **MongoDB Compass**: For database inspection
- **Postman**: For API testing
- **Jest Documentation**: https://jestjs.io/
- **Supertest Documentation**: https://github.com/visionmedia/supertest

---

## Summary

This testing guide covers:
✅ Complete API testing for all 16 endpoints
✅ Manual testing workflows
✅ Automated testing setup
✅ Error handling scenarios
✅ Performance considerations
✅ Troubleshooting tips

For questions or issues, refer to the main `GUIDELINES.md` in the audit module folder.

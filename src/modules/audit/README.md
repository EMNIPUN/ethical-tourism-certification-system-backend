# Audit & Review Module

## Overview

The Audit & Review module provides a comprehensive system for auditors to systematically review hotel certification requests. Each major section of a hotel's application can be reviewed independently with toggles, comments, scores, and detailed notes.

## Features

### ✅ Section-Wise Review

- **businessInfo**: Business registration and contact details
- **legalDocuments**: Licenses, permits, and compliance documents
- **employeePractices**: Workforce, labor rights, and employee welfare
- **sustainability**: Environmental practices and resource management
- **community**: Local support and social responsibility
- **guestServices**: Facilities, safety, and service quality

### 🎯 Review Capabilities

- **Toggle Status**: pending, approved, rejected, needs_revision
- **Add Comments**: Up to 2000 characters per section
- **Score Sections**: 0-100 scoring for each section
- **Add Notes**: Document specific issues with severity levels (minor, major, critical)

### 📊 Comprehensive Audit Management

- **Site Visit Scheduling**: Plan and document on-site inspections
- **Compliance Checks**: Track specific compliance items
- **Attachments**: Upload supporting documents and evidence
- **Audit Log**: Complete history of all actions
- **Statistics**: Dashboard metrics for audit overview

### 🔐 Role-Based Access

- **Admin**: Full access to all audits, can suspend/resume/delete
- **Auditor**: Access to assigned audits, can review and complete

## Architecture

The module follows **strict MVC architecture**:

```
audit/
├── models/
│   └── Audit.js                 # Data schema
├── controllers/
│   └── auditController.js       # HTTP request handlers
├── services/
│   └── auditService.js          # Business logic
├── routes/
│   ├── index.js                 # Route aggregator
│   └── auditRoutes.js           # API endpoints
├── validations/
│   └── auditValidation.js       # Input validation schemas
├── GUIDELINES.md                # Module guidelines
├── TESTING_GUIDE.md             # Comprehensive testing guide
└── README.md                    # This file
```

## Quick Start

### 1. Prerequisites

- Node.js (v14+)
- MongoDB (running)
- Existing hotel certification system

### 2. Installation

```bash
npm install
```

### 3. Start Server

```bash
npm start
```

### 4. Access API Documentation

Navigate to: `http://localhost:5000/api/v1/api-docs`  
Find all endpoints under **"Audit & Review"** tag

## API Endpoints

| Method | Endpoint                          | Description                | Access         |
| ------ | --------------------------------- | -------------------------- | -------------- |
| POST   | `/audits`                         | Create new audit           | Admin          |
| GET    | `/audits`                         | Get all audits (paginated) | Admin, Auditor |
| GET    | `/audits/:id`                     | Get audit by ID            | Admin, Auditor |
| PUT    | `/audits/:id/sections/review`     | Review a section           | Admin, Auditor |
| PUT    | `/audits/:id/sections/score`      | Update section score       | Admin, Auditor |
| POST   | `/audits/:id/compliance-checks`   | Add compliance check       | Admin, Auditor |
| POST   | `/audits/:id/site-visit/schedule` | Schedule site visit        | Admin, Auditor |
| PUT    | `/audits/:id/site-visit/findings` | Update site visit findings | Admin, Auditor |
| POST   | `/audits/:id/attachments`         | Add attachment             | Admin, Auditor |
| PUT    | `/audits/:id/complete`            | Complete audit             | Admin, Auditor |
| GET    | `/audits/hotel/:hotelId`          | Get audits by hotel        | Admin, Auditor |
| GET    | `/audits/auditor/:auditorId`      | Get audits by auditor      | Admin, Auditor |
| PUT    | `/audits/:id/suspend`             | Suspend audit              | Admin          |
| PUT    | `/audits/:id/resume`              | Resume audit               | Admin          |
| DELETE | `/audits/:id`                     | Delete audit               | Admin          |
| GET    | `/audits/stats/overview`          | Get statistics             | Admin          |

## Usage Examples

### Create an Audit

```javascript
POST /api/v1/audits
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "hotel": "698a02d268417518fd9b33ef",
  "auditor": "698b12345678901234567890"
}
```

### Review a Section

```javascript
PUT /api/v1/audits/AUDIT_ID/sections/review
Authorization: Bearer YOUR_AUDITOR_TOKEN

{
  "sectionName": "sustainability",
  "status": "approved",
  "comment": "Excellent waste management and energy conservation practices",
  "score": 92,
  "notes": [
    {
      "field": "renewableEnergyPercentage",
      "issue": "Consider increasing renewable energy to 25%",
      "severity": "minor"
    }
  ]
}
```

### Complete Audit

```javascript
PUT /api/v1/audits/AUDIT_ID/complete
Authorization: Bearer YOUR_AUDITOR_TOKEN

{
  "recommendation": "approve",
  "finalComments": "Hotel meets all certification criteria. Recommended for Gold level certification.",
  "overallScore": 87
}
```

## Scoring System

### Section Weights

The overall audit score is calculated using weighted section scores:

- **Business Info**: 10%
- **Legal Documents**: 15%
- **Employee Practices**: 25%
- **Sustainability**: 25%
- **Community**: 15%
- **Guest Services**: 10%

### Certification Levels

Based on the overall audit score (combined with other factors):

- **Gold**: 80+ points
- **Silver**: 60-79 points
- **Bronze**: 40-59 points
- **None**: < 40 points

## Audit Workflow

1. **Initiation** (Admin)
   - Create audit
   - Assign auditor
   - Status: `initiated`

2. **Review Phase** (Auditor)
   - Review each section
   - Add compliance checks
   - Schedule site visit
   - Status: `in_progress`

3. **Site Visit** (Auditor)
   - Conduct on-site inspection
   - Update findings
   - Add attachments

4. **Completion** (Auditor)
   - Ensure all sections reviewed
   - Submit final recommendation
   - Status: `completed`

5. **Integration**
   - Hotel's `auditorScore` updated automatically
   - Total certification score recalculated
   - Certification level updated

## Data Models

### Audit Schema

```javascript
{
  hotel: ObjectId,              // Reference to Hotel
  auditor: ObjectId,            // Reference to User (Auditor)
  auditStatus: String,          // initiated, in_progress, completed, suspended

  sections: {
    businessInfo: {
      status: String,           // pending, approved, rejected, needs_revision
      comment: String,
      reviewedBy: ObjectId,
      reviewedAt: Date,
      notes: [...]
    },
    // ... 5 more sections
  },

  sectionScores: {
    businessInfo: Number,       // 0-100
    // ... 5 more sections
  },

  overallScore: Number,         // 0-100 (calculated)
  recommendation: String,       // approve, reject, conditional_approval, pending
  finalComments: String,

  siteVisit: {...},
  complianceChecks: [...],
  attachments: [...],
  auditLog: [...]
}
```

## Testing

Comprehensive testing guide available in [`TESTING_GUIDE.md`](./TESTING_GUIDE.md)

### Quick Test

```bash
# 1. Start server
npm start

# 2. Create admin user and login to get token

# 3. Create test hotel

# 4. Test create audit
curl -X POST http://localhost:5000/api/v1/audits \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hotel":"HOTEL_ID","auditor":"AUDITOR_ID"}'
```

## Error Handling

All endpoints return consistent error responses:

```javascript
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP Status Codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Server Error

## Security

### Authentication

All endpoints require JWT authentication:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Authorization

- **Admin**: Full access
- **Auditor**: Can only access/modify assigned audits

### Input Validation

All inputs are validated using Joi schemas before processing.

## Performance Considerations

- **Pagination**: All list endpoints support pagination
- **Indexes**: MongoDB indexes on `hotel`, `auditor`, `auditStatus`, `createdAt`
- **Population**: Related documents (hotel, auditor) are populated efficiently
- **Aggregation**: Statistics use MongoDB aggregation pipeline

## Future Enhancements

- [ ] File upload for attachments (currently accepts URLs)
- [ ] Email notifications for audit milestones
- [ ] Audit templates for different hotel types
- [ ] Automated compliance check suggestions
- [ ] Export audit reports to PDF
- [ ] Real-time collaboration features
- [ ] Mobile app for on-site audits

## Contributing

When contributing to the audit module:

1. Follow the MVC architecture strictly
2. Add validation for all new endpoints
3. Update Swagger documentation
4. Write tests for new features
5. Update this README if adding new capabilities

## Support

For issues or questions:

- Check [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) for troubleshooting
- Review [`GUIDELINES.md`](./GUIDELINES.md) for development guidelines
- Check Swagger docs: `http://localhost:5000/api/v1/api-docs`

## License

Part of the Ethical Tourism Certification System (CertiGuard™)

---

**Version**: 1.0.0  
**Last Updated**: February 25, 2026  
**Maintained By**: Development Team
